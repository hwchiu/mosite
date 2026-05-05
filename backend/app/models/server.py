import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import ServerStatus, ServerModel, ServiceType


class Server(Base):
    __tablename__ = "servers"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    hostname: Mapped[str] = mapped_column(String, nullable=False)
    serial_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    model: Mapped[ServerModel] = mapped_column(
        SAEnum(ServerModel, name="servermodel"), nullable=False
    )
    service_type: Mapped[ServiceType] = mapped_column(
        SAEnum(ServiceType, name="servicetype"), nullable=False
    )
    status: Mapped[ServerStatus] = mapped_column(
        SAEnum(ServerStatus, name="serverstatus"),
        nullable=False,
        default=ServerStatus.purchased,
        server_default=ServerStatus.purchased.value,
    )
    factory_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("factories.id", ondelete="RESTRICT"), nullable=False
    )
    cluster_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("clusters.id", ondelete="SET NULL"), nullable=True
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("purchase_batches.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    factory: Mapped["Factory"] = relationship(  # noqa: F821
        "Factory", back_populates="servers", lazy="selectin"
    )
    cluster: Mapped["Cluster | None"] = relationship(  # noqa: F821
        "Cluster", back_populates="servers", lazy="selectin"
    )
    batch: Mapped["PurchaseBatch | None"] = relationship(  # noqa: F821
        "PurchaseBatch", back_populates="servers", lazy="selectin"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(  # noqa: F821
        "AuditLog", back_populates="server", lazy="selectin", order_by="AuditLog.created_at.desc()"
    )
