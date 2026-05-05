import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PurchaseBatch(Base):
    __tablename__ = "purchase_batches"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    factory_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("factories.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    factory: Mapped["Factory | None"] = relationship(  # noqa: F821
        "Factory", back_populates="purchase_batches", lazy="selectin"
    )
    servers: Mapped[list["Server"]] = relationship(  # noqa: F821
        "Server", back_populates="batch", lazy="selectin"
    )
