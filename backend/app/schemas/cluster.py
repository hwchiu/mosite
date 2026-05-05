import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.base import ClusterType


class ClusterBase(BaseModel):
    name: str
    type: ClusterType
    factory_id: uuid.UUID
    description: Optional[str] = None


class ClusterCreate(ClusterBase):
    pass


class ClusterUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ClusterOut(ClusterBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClusterDetail(ClusterOut):
    servers: list["ServerOut"] = []  # noqa: F821

    model_config = ConfigDict(from_attributes=True)


from app.schemas.server import ServerOut  # noqa: E402

ClusterDetail.model_rebuild()
