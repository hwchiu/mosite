import uuid
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.purchase_batch import PurchaseBatch
from app.models.factory import Factory
from app.schemas.purchase_batch import BatchCreate, BatchUpdate, BatchOut, BatchDetail

router = APIRouter(prefix="/batches", tags=["batches"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[BatchOut])
async def list_batches(
    db: DbDep,
    factory_id: Optional[uuid.UUID] = Query(default=None),
) -> list[BatchOut]:
    stmt = select(PurchaseBatch)
    if factory_id:
        stmt = stmt.where(PurchaseBatch.factory_id == factory_id)
    stmt = stmt.order_by(PurchaseBatch.purchase_date.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=BatchOut, status_code=status.HTTP_201_CREATED)
async def create_batch(payload: BatchCreate, db: DbDep) -> BatchOut:
    if payload.factory_id:
        factory = await db.get(Factory, payload.factory_id)
        if not factory:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factory not found.")

    batch = PurchaseBatch(
        name=payload.name,
        purchase_date=payload.purchase_date,
        factory_id=payload.factory_id,
        notes=payload.notes,
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    return batch


@router.get("/{batch_id}", response_model=BatchDetail)
async def get_batch(batch_id: str, db: DbDep) -> BatchDetail:
    result = await db.execute(select(PurchaseBatch).where(PurchaseBatch.id == batch_id))
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found.")
    return batch


@router.patch("/{batch_id}", response_model=BatchOut)
async def update_batch(batch_id: str, payload: BatchUpdate, db: DbDep) -> BatchOut:
    result = await db.execute(select(PurchaseBatch).where(PurchaseBatch.id == batch_id))
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(batch, field, value)

    await db.commit()
    await db.refresh(batch)
    return batch
