"""
CRUD endpoints para Keywords (palabras/razones sociales a vigilar).
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db, Keyword
from models import KeywordCreate, KeywordRead, KeywordWithFindings, MessageResponse

router = APIRouter(prefix="/keywords", tags=["keywords"])


@router.post("/", response_model=KeywordRead, status_code=status.HTTP_201_CREATED)
def create_keyword(payload: KeywordCreate, db: Session = Depends(get_db)):
    existing = db.query(Keyword).filter(
        Keyword.term == payload.term,
        Keyword.user_id == payload.user_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El término '{payload.term}' ya está registrado para este usuario.",
        )

    kw = Keyword(**payload.model_dump())
    db.add(kw)
    db.commit()
    db.refresh(kw)
    return kw


@router.get("/", response_model=List[KeywordRead])
def list_keywords(user_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Keyword)
    if user_id is not None:
        q = q.filter(Keyword.user_id == user_id)
    return q.order_by(Keyword.created_at.desc()).all()


@router.get("/{keyword_id}", response_model=KeywordWithFindings)
def get_keyword(keyword_id: int, db: Session = Depends(get_db)):
    kw = db.query(Keyword).filter(Keyword.id == keyword_id).first()
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword no encontrada.")
    return kw


@router.delete("/{keyword_id}", response_model=MessageResponse)
def delete_keyword(keyword_id: int, db: Session = Depends(get_db)):
    kw = db.query(Keyword).filter(Keyword.id == keyword_id).first()
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword no encontrada.")
    db.delete(kw)
    db.commit()
    return {"message": f"Keyword '{kw.term}' eliminada correctamente."}
