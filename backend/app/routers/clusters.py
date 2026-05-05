import uuid
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.cluster import Cluster
from app.models.factory import Factory
from app.models.server import Server
from app.models.base import ClusterType
from app.schemas.cluster import ClusterCreate, ClusterUpdate, ClusterOut, ClusterDetail

router = APIRouter(prefix="/clusters", tags=["clusters"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[ClusterOut])
async def list_clusters(
    db: DbDep,
    factory_id: Optional[uuid.UUID] = Query(default=None),
    type: Optional[ClusterType] = Query(default=None),
) -> list[ClusterOut]:
    stmt = select(Cluster)
    if factory_id:
        stmt = stmt.where(Cluster.factory_id == factory_id)
    if type:
        stmt = stmt.where(Cluster.type == type)
    stmt = stmt.order_by(Cluster.name)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ClusterOut, status_code=status.HTTP_201_CREATED)
async def create_cluster(payload: ClusterCreate, db: DbDep) -> ClusterOut:
    factory = await db.get(Factory, payload.factory_id)
    if not factory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factory not found.")

    cluster = Cluster(
        name=payload.name,
        type=payload.type,
        factory_id=payload.factory_id,
        description=payload.description,
    )
    db.add(cluster)
    await db.commit()
    await db.refresh(cluster)
    return cluster


@router.get("/{cluster_id}", response_model=ClusterDetail)
async def get_cluster(cluster_id: str, db: DbDep) -> ClusterDetail:
    result = await db.execute(
        select(Cluster).where(Cluster.id == cluster_id)
    )
    cluster = result.scalar_one_or_none()
    if not cluster:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cluster not found.")
    return cluster


@router.patch("/{cluster_id}", response_model=ClusterOut)
async def update_cluster(cluster_id: str, payload: ClusterUpdate, db: DbDep) -> ClusterOut:
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()
    if not cluster:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cluster not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cluster, field, value)

    await db.commit()
    await db.refresh(cluster)
    return cluster


@router.delete("/{cluster_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cluster(cluster_id: str, db: DbDep) -> None:
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()
    if not cluster:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cluster not found.")

    server_count = await db.execute(
        select(func.count()).select_from(Server).where(Server.cluster_id == cluster_id)
    )
    if server_count.scalar_one() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete cluster: servers still reference it.",
        )

    await db.delete(cluster)
    await db.commit()
