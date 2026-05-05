import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.base import ServerStatus, ServerModel, ServiceType
from app.schemas.audit_log import AuditLogOut


class ServerBase(BaseModel):
    hostname: str
    serial_number: str
    ip_address: Optional[str] = None
    model: ServerModel
    service_type: ServiceType
    factory_id: uuid.UUID
    cluster_id: Optional[uuid.UUID] = None
    batch_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class ServerCreate(ServerBase):
    status: ServerStatus = ServerStatus.purchased


class ServerUpdate(BaseModel):
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    model: Optional[ServerModel] = None
    service_type: Optional[ServiceType] = None
    status: Optional[ServerStatus] = None
    factory_id: Optional[uuid.UUID] = None
    cluster_id: Optional[uuid.UUID] = None
    batch_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    operator: str
    comment: Optional[str] = None


class ServerOut(ServerBase):
    id: uuid.UUID
    status: ServerStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServerDetail(ServerOut):
    audit_logs: list[AuditLogOut] = []

    model_config = ConfigDict(from_attributes=True)
