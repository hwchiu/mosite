from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.server import Server
from app.models.factory import Factory
from app.models.cluster import Cluster
from app.models.base import ServerStatus, ServerModel, ServiceType
from app.schemas.dashboard import (
    DashboardSummary,
    StatusCounts,
    FactorySummary,
    ClusterSummary,
    ModelBreakdown,
    ModelCount,
    ServiceBreakdown,
    ServiceStatusCount,
)


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_summary(self) -> DashboardSummary:
        result = await self.db.execute(
            select(Server.status, func.count(Server.id).label("cnt"))
            .group_by(Server.status)
        )
        rows = result.all()
        counts: dict[str, int] = {r.status.value: r.cnt for r in rows}
        by_status = StatusCounts(
            purchased=counts.get(ServerStatus.purchased.value, 0),
            waiting_infra=counts.get(ServerStatus.waiting_infra.value, 0),
            waiting_cluster_setup=counts.get(ServerStatus.waiting_cluster_setup.value, 0),
            waiting_platform=counts.get(ServerStatus.waiting_platform.value, 0),
            active=counts.get(ServerStatus.active.value, 0),
            retired=counts.get(ServerStatus.retired.value, 0),
        )
        total = sum(counts.values())
        return DashboardSummary(total=total, by_status=by_status)

    async def get_by_factory(self) -> list[FactorySummary]:
        factories_result = await self.db.execute(select(Factory).order_by(Factory.name))
        factories = factories_result.scalars().all()

        servers_result = await self.db.execute(
            select(Server.factory_id, Server.status, func.count(Server.id).label("cnt"))
            .group_by(Server.factory_id, Server.status)
        )
        rows = servers_result.all()

        factory_counts: dict[str, dict[str, int]] = {}
        for row in rows:
            fid = str(row.factory_id)
            if fid not in factory_counts:
                factory_counts[fid] = {}
            factory_counts[fid][row.status.value] = row.cnt

        summaries: list[FactorySummary] = []
        for factory in factories:
            fid = str(factory.id)
            counts = factory_counts.get(fid, {})
            by_status = StatusCounts(
                purchased=counts.get(ServerStatus.purchased.value, 0),
                waiting_infra=counts.get(ServerStatus.waiting_infra.value, 0),
                waiting_cluster_setup=counts.get(ServerStatus.waiting_cluster_setup.value, 0),
                waiting_platform=counts.get(ServerStatus.waiting_platform.value, 0),
                active=counts.get(ServerStatus.active.value, 0),
                retired=counts.get(ServerStatus.retired.value, 0),
            )
            total = sum(counts.values())
            summaries.append(
                FactorySummary(
                    factory_name=factory.name,
                    counts_by_status=by_status,
                    total=total,
                )
            )
        return summaries

    async def get_by_cluster(self) -> list[ClusterSummary]:
        clusters_result = await self.db.execute(
            select(Cluster).order_by(Cluster.name)
        )
        clusters = clusters_result.scalars().all()

        total_result = await self.db.execute(
            select(Server.cluster_id, func.count(Server.id).label("cnt"))
            .where(Server.cluster_id.isnot(None))
            .group_by(Server.cluster_id)
        )
        total_counts: dict[str, int] = {str(r.cluster_id): r.cnt for r in total_result.all()}

        active_result = await self.db.execute(
            select(Server.cluster_id, func.count(Server.id).label("cnt"))
            .where(Server.cluster_id.isnot(None), Server.status == ServerStatus.active)
            .group_by(Server.cluster_id)
        )
        active_counts: dict[str, int] = {str(r.cluster_id): r.cnt for r in active_result.all()}

        inactive_statuses = [
            s for s in ServerStatus
            if s not in (ServerStatus.active, ServerStatus.retired)
        ]
        available_result = await self.db.execute(
            select(Server.cluster_id, func.count(Server.id).label("cnt"))
            .where(
                Server.cluster_id.isnot(None),
                Server.status.in_(inactive_statuses),
            )
            .group_by(Server.cluster_id)
        )
        available_counts: dict[str, int] = {
            str(r.cluster_id): r.cnt for r in available_result.all()
        }

        factory_names: dict[str, str] = {}
        factories_result = await self.db.execute(select(Factory))
        for f in factories_result.scalars().all():
            factory_names[str(f.id)] = f.name

        summaries: list[ClusterSummary] = []
        for cluster in clusters:
            cid = str(cluster.id)
            factory_name = factory_names.get(str(cluster.factory_id), "Unknown")
            summaries.append(
                ClusterSummary(
                    cluster_id=cid,
                    cluster_name=cluster.name,
                    cluster_type=cluster.type,
                    factory_name=factory_name,
                    total_servers=total_counts.get(cid, 0),
                    active_count=active_counts.get(cid, 0),
                    available_count=available_counts.get(cid, 0),
                )
            )
        return summaries

    async def get_model_breakdown(self) -> ModelBreakdown:
        result = await self.db.execute(
            select(Server.model, func.count(Server.id).label("cnt"))
            .group_by(Server.model)
            .order_by(Server.model)
        )
        rows = result.all()
        breakdown = [ModelCount(model=r.model, count=r.cnt) for r in rows]
        for m in ServerModel:
            if not any(item.model == m for item in breakdown):
                breakdown.append(ModelCount(model=m, count=0))
        breakdown.sort(key=lambda x: x.model.value)
        return ModelBreakdown(breakdown=breakdown)

    async def get_service_breakdown(self) -> ServiceBreakdown:
        result = await self.db.execute(
            select(
                Server.service_type,
                Server.status,
                func.count(Server.id).label("cnt"),
            )
            .group_by(Server.service_type, Server.status)
            .order_by(Server.service_type, Server.status)
        )
        rows = result.all()
        breakdown = [
            ServiceStatusCount(service_type=r.service_type, status=r.status, count=r.cnt)
            for r in rows
        ]
        return ServiceBreakdown(breakdown=breakdown)
