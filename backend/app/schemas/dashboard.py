from typing import Optional
from pydantic import BaseModel
from app.models.base import ServerStatus, ServerModel, ServiceType, ClusterType


class StatusCounts(BaseModel):
    purchased: int = 0
    waiting_infra: int = 0
    waiting_cluster_setup: int = 0
    waiting_platform: int = 0
    active: int = 0
    retired: int = 0


class DashboardSummary(BaseModel):
    total: int
    by_status: StatusCounts


class FactorySummary(BaseModel):
    factory_name: str
    counts_by_status: StatusCounts
    total: int


class ClusterSummary(BaseModel):
    cluster_id: str
    cluster_name: str
    cluster_type: ClusterType
    factory_name: str
    total_servers: int
    active_count: int
    available_count: int


class ModelCount(BaseModel):
    model: ServerModel
    count: int


class ModelBreakdown(BaseModel):
    breakdown: list[ModelCount]


class ServiceStatusCount(BaseModel):
    service_type: ServiceType
    status: ServerStatus
    count: int


class ServiceBreakdown(BaseModel):
    breakdown: list[ServiceStatusCount]
