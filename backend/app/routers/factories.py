from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.factory import Factory
from app.models.server import Server
from app.schemas.factory import FactoryCreate, FactoryOut

router = APIRouter(prefix="/factories", tags=["factories"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[FactoryOut])
async def list_factories(db: DbDep) -> list[FactoryOut]:
    result = await db.execute(select(Factory).order_by(Factory.name))
    return result.scalars().all()


@router.post("", response_model=FactoryOut, status_code=status.HTTP_201_CREATED)
async def create_factory(payload: FactoryCreate, db: DbDep) -> FactoryOut:
    existing = await db.execute(select(Factory).where(Factory.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Factory with name '{payload.name}' already exists.",
        )
    factory = Factory(name=payload.name)
    db.add(factory)
    await db.commit()
    await db.refresh(factory)
    return factory


@router.delete("/{factory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_factory(factory_id: str, db: DbDep) -> None:
    result = await db.execute(select(Factory).where(Factory.id == factory_id))
    factory = result.scalar_one_or_none()
    if not factory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factory not found.")

    server_count = await db.execute(
        select(func.count()).select_from(Server).where(Server.factory_id == factory_id)
    )
    if server_count.scalar_one() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete factory: servers still reference it.",
        )

    await db.delete(factory)
    await db.commit()
