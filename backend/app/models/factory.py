import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Factory(Base):
    __tablename__ = "factories"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    clusters: Mapped[list["Cluster"]] = relationship(  # noqa: F821
        "Cluster", back_populates="factory", lazy="selectin"
    )
    servers: Mapped[list["Server"]] = relationship(  # noqa: F821
        "Server", back_populates="factory", lazy="selectin"
    )
    purchase_batches: Mapped[list["PurchaseBatch"]] = relationship(  # noqa: F821
        "PurchaseBatch", back_populates="factory", lazy="selectin"
    )
