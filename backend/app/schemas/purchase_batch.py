import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict


class BatchBase(BaseModel):
    name: str
    purchase_date: date
    factory_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None


class BatchOut(BatchBase):
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BatchDetail(BatchOut):
    servers: list["ServerOut"] = []  # noqa: F821

    model_config = ConfigDict(from_attributes=True)


from app.schemas.server import ServerOut  # noqa: E402

BatchDetail.model_rebuild()
