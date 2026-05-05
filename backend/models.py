"""
Pydantic v2 schemas — request/response contracts for the API.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator
from database import FindingStatus


# ──────────────────────────────────────────────
# User
# ──────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr


class UserRead(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Keyword
# ──────────────────────────────────────────────

class KeywordCreate(BaseModel):
    term: str
    description: Optional[str] = None
    user_id: int

    @field_validator("term")
    @classmethod
    def term_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El término de búsqueda no puede estar vacío.")
        return v


class KeywordRead(BaseModel):
    id: int
    term: str
    description: Optional[str]
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class KeywordWithFindings(KeywordRead):
    findings: List["FindingRead"] = []


# ──────────────────────────────────────────────
# Finding
# ──────────────────────────────────────────────

class FindingRead(BaseModel):
    id: int
    keyword_id: int
    bulletin_date: Optional[str]
    bulletin_url: Optional[str]
    juzgado: Optional[str]
    expediente: Optional[str]
    raw_excerpt: Optional[str]
    ai_summary: Optional[str]
    ai_interpretation: Optional[str]
    status: FindingStatus
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Scan request / response
# ──────────────────────────────────────────────

class ScanRequest(BaseModel):
    keyword_id: int
    bulletin_date: Optional[str] = None   # "YYYY-MM-DD"; defaults to today


class ScanResponse(BaseModel):
    keyword_id: int
    keyword_term: str
    findings_created: int
    message: str


# ──────────────────────────────────────────────
# Generic response
# ──────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
