from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, JSON
from app.core.database import Base

class ExtractedData(Base):
    __tablename__ = 'extracted_data'

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    claim_id: Mapped[str] = mapped_column(String(100), ForeignKey('claims.id', ondelete='CASCADE'), nullable=False)
    extracted_json: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Relationships
    claim = relationship("Claim", back_populates="extracted_data")
