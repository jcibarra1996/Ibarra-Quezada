"""
SQLAlchemy database setup and ORM models.
SQLite for MVP — swap DATABASE_URL to PostgreSQL for production.
"""

from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Text,
    DateTime, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker
import enum
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./judicial_monitor.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class FindingStatus(str, enum.Enum):
    PENDING = "pending"
    FOUND = "found"
    NOT_FOUND = "not_found"
    ERROR = "error"


# ──────────────────────────────────────────────
# Tables
# ──────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    keywords = relationship("Keyword", back_populates="owner", cascade="all, delete-orphan")


class Keyword(Base):
    __tablename__ = "keywords"

    id = Column(Integer, primary_key=True, index=True)
    term = Column(String(300), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="keywords")
    findings = relationship("Finding", back_populates="keyword", cascade="all, delete-orphan")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    keyword_id = Column(Integer, ForeignKey("keywords.id"), nullable=False)

    # Source metadata
    bulletin_date = Column(String(20), nullable=True)
    bulletin_url = Column(String(500), nullable=True)
    pdf_path = Column(String(500), nullable=True)

    # Extracted data
    juzgado = Column(String(300), nullable=True)
    expediente = Column(String(200), nullable=True)
    raw_excerpt = Column(Text, nullable=True)

    # AI output
    ai_summary = Column(Text, nullable=True)
    ai_interpretation = Column(Text, nullable=True)

    status = Column(SAEnum(FindingStatus), default=FindingStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)

    keyword = relationship("Keyword", back_populates="findings")


# ──────────────────────────────────────────────
# Dependency for FastAPI
# ──────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables on startup."""
    Base.metadata.create_all(bind=engine)
