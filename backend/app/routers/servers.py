import uuid
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models.server import Server
from app.models.audit_log import AuditLog
from app.models.factory import Factory
from app.models.cluster import Cluster
from app.models.purchase_batch import PurchaseBatch
from app.models.base import ServerStatus, ServerModel, ServiceType
from app.schemas.server import ServerCreate, ServerUpdate, ServerOut, ServerDetail

router = APIRouter(prefix="/servers", tags=["servers"])

DbDep = Annotated[AsyncSession, Depends(get_db)]

AUDITABLE_FIELDS = [
    "hostname", "ip_address", "model", "service_type", "status",
    "factory_id", "cluster_id", "batch_id", "notes",
]


def _str_val(value) -> Optional[str]:
    if value is None:
        return None
    if hasattr(value, "value"):
        return value.value
    return str(value)


@router.get("", response_model=list[ServerOut])
async def list_servers(
    db: DbDep,
    factory_id: Optional[uuid.UUID] = Query(default=None),
    status: Optional[ServerStatus] = Query(default=None),
    model: Optional[ServerModel] = Query(default=None),
    service_type: Optional[ServiceType] = Query(default=None),
    cluster_id: Optional[uuid.UUID] = Query(default=None),
    batch_id: Optional[uuid.UUID] = Query(default=None),
    search: Optional[str] = Query(default=None),
) -> list[ServerOut]:
    stmt = select(Server)
    if factory_id:
        stmt = stmt.where(Server.factory_id == factory_id)
    if status:
        stmt = stmt.where(Server.status == status)
    if model:
        stmt = stmt.where(Server.model == model)
    if service_type:
        stmt = stmt.where(Server.service_type == service_type)
    if cluster_id:
        stmt = stmt.where(Server.cluster_id == cluster_id)
    if batch_id:
        stmt = stmt.where(Server.batch_id == batch_id)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Server.hostname.ilike(pattern),
                Server.serial_number.ilike(pattern),
                Server.ip_address.ilike(pattern),
            )
        )
    stmt = stmt.order_by(Server.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ServerOut, status_code=status.HTTP_201_CREATED)
async def create_server(payload: ServerCreate, db: DbDep) -> ServerOut:
    await _validate_fk_references(db, payload.factory_id, payload.cluster_id, payload.batch_id)

    existing = await db.execute(
        select(Server).where(Server.serial_number == payload.serial_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Server with serial_number '{payload.serial_number}' already exists.",
        )

    server = Server(**payload.model_dump())
    db.add(server)
    await db.commit()
    await db.refresh(server)
    return server


@router.post("/bulk", response_model=list[ServerOut], status_code=status.HTTP_201_CREATED)
async def bulk_create_servers(payloads: list[ServerCreate], db: DbDep) -> list[ServerOut]:
    if not payloads:
        return []

    serial_numbers = [p.serial_number for p in payloads]
    if len(serial_numbers) != len(set(serial_numbers)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Duplicate serial_numbers in bulk request.",
        )

    existing = await db.execute(
        select(Server.serial_number).where(Server.serial_number.in_(serial_numbers))
    )
    existing_serials = set(existing.scalars().all())
    if existing_serials:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Serial numbers already exist: {', '.join(existing_serials)}",
        )

    servers = []
    for payload in payloads:
        await _validate_fk_references(db, payload.factory_id, payload.cluster_id, payload.batch_id)
        server = Server(**payload.model_dump())
        db.add(server)
        servers.append(server)

    await db.commit()
    for server in servers:
        await db.refresh(server)
    return servers


@router.get("/{server_id}", response_model=ServerDetail)
async def get_server(server_id: str, db: DbDep) -> ServerDetail:
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found.")
    return server


@router.patch("/{server_id}", response_model=ServerOut)
async def update_server(server_id: str, payload: ServerUpdate, db: DbDep) -> ServerOut:
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found.")

    update_data = payload.model_dump(exclude_unset=True, exclude={"operator", "comment"})
    operator = payload.operator
    comment = payload.comment

    if not update_data:
        return server

    if "factory_id" in update_data or "cluster_id" in update_data or "batch_id" in update_data:
        new_factory_id = update_data.get("factory_id", server.factory_id)
        new_cluster_id = update_data.get("cluster_id", server.cluster_id)
        new_batch_id = update_data.get("batch_id", server.batch_id)
        await _validate_fk_references(db, new_factory_id, new_cluster_id, new_batch_id)

    audit_entries: list[AuditLog] = []
    for field in AUDITABLE_FIELDS:
        if field not in update_data:
            continue
        old_val = _str_val(getattr(server, field))
        new_val = _str_val(update_data[field])
        if old_val != new_val:
            audit_entries.append(
                AuditLog(
                    server_id=server.id,
                    operator=operator,
                    field=field,
                    old_value=old_val,
                    new_value=new_val,
                    comment=comment,
                )
            )

    for field, value in update_data.items():
        setattr(server, field, value)

    for entry in audit_entries:
        db.add(entry)

    await db.commit()
    await db.refresh(server)
    return server


@router.delete("/{server_id}", status_code=status.HTTP_200_OK)
async def delete_server(
    server_id: str,
    db: DbDep,
    operator: str = Query(..., description="Operator performing the retirement"),
    comment: Optional[str] = Query(default=None),
) -> dict:
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found.")

    if server.status != ServerStatus.retired:
        old_status = _str_val(server.status)
        server.status = ServerStatus.retired
        db.add(
            AuditLog(
                server_id=server.id,
                operator=operator,
                field="status",
                old_value=old_status,
                new_value=ServerStatus.retired.value,
                comment=comment or "Server retired (soft delete)",
            )
        )
        await db.commit()

    return {"detail": "Server retired successfully."}


async def _validate_fk_references(
    db: AsyncSession,
    factory_id: Optional[uuid.UUID],
    cluster_id: Optional[uuid.UUID],
    batch_id: Optional[uuid.UUID],
) -> None:
    if factory_id:
        factory = await db.get(Factory, factory_id)
        if not factory:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factory not found.")
    if cluster_id:
        cluster = await db.get(Cluster, cluster_id)
        if not cluster:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cluster not found.")
    if batch_id:
        batch = await db.get(PurchaseBatch, batch_id)
        if not batch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found.")
