"""
Endpoints de lectura para Hallazgos (Findings).
Los hallazgos se crean desde el router de scan, aquí solo se consultan.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, Finding, FindingStatus
from models import FindingRead

router = APIRouter(prefix="/findings", tags=["findings"])


@router.get("/", response_model=List[FindingRead])
def list_findings(
    keyword_id: Optional[int] = None,
    status: Optional[FindingStatus] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Finding)
    if keyword_id is not None:
        q = q.filter(Finding.keyword_id == keyword_id)
    if status is not None:
        q = q.filter(Finding.status == status)
    return q.order_by(Finding.created_at.desc()).all()


@router.get("/{finding_id}", response_model=FindingRead)
def get_finding(finding_id: int, db: Session = Depends(get_db)):
    f = db.query(Finding).filter(Finding.id == finding_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Hallazgo no encontrado.")
    return f


@router.delete("/{finding_id}")
def delete_finding(finding_id: int, db: Session = Depends(get_db)):
    f = db.query(Finding).filter(Finding.id == finding_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Hallazgo no encontrado.")
    db.delete(f)
    db.commit()
    return {"message": "Hallazgo eliminado."}
