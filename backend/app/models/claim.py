import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Float, Text, DateTime
from app.core.database import Base

class Claim(Base):
    __tablename__ = 'claims'

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    claimed_amount: Mapped[float] = mapped_column(Float, default=0.0)
    approved_amount: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    decision_reason: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="claim", cascade="all, delete-orphan", lazy="selectin")
    extracted_data = relationship("ExtractedData", back_populates="claim", uselist=False, cascade="all, delete-orphan", lazy="selectin")
