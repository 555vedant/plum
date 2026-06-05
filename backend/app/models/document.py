from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey
from app.core.database import Base

class Document(Base):
    __tablename__ = 'documents'

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    claim_id: Mapped[str] = mapped_column(String(100), ForeignKey('claims.id', ondelete='CASCADE'), nullable=False)
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    storage_url: Mapped[str] = mapped_column(String(500), nullable=False)

    # Relationships
    claim = relationship("Claim", back_populates="documents")
