from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import (
    DashboardSummary,
    FactorySummary,
    ClusterSummary,
    ModelBreakdown,
    ServiceBreakdown,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(db: DbDep) -> DashboardSummary:
    svc = DashboardService(db)
    return await svc.get_summary()


@router.get("/by-factory", response_model=list[FactorySummary])
async def get_by_factory(db: DbDep) -> list[FactorySummary]:
    svc = DashboardService(db)
    return await svc.get_by_factory()


@router.get("/by-cluster", response_model=list[ClusterSummary])
async def get_by_cluster(db: DbDep) -> list[ClusterSummary]:
    svc = DashboardService(db)
    return await svc.get_by_cluster()


@router.get("/model-breakdown", response_model=ModelBreakdown)
async def get_model_breakdown(db: DbDep) -> ModelBreakdown:
    svc = DashboardService(db)
    return await svc.get_model_breakdown()


@router.get("/service-breakdown", response_model=ServiceBreakdown)
async def get_service_breakdown(db: DbDep) -> ServiceBreakdown:
    svc = DashboardService(db)
    return await svc.get_service_breakdown()
