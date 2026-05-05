import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import ClusterType


class Cluster(Base):
    __tablename__ = "clusters"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[ClusterType] = mapped_column(
        SAEnum(ClusterType, name="clustertype"), nullable=False
    )
    factory_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("factories.id", ondelete="RESTRICT"), nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
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
        "Factory", back_populates="clusters", lazy="selectin"
    )
    servers: Mapped[list["Server"]] = relationship(  # noqa: F821
        "Server", back_populates="cluster", lazy="selectin"
    )
