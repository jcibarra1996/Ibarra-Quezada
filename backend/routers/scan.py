"""
Endpoint que orquesta el pipeline completo:
  1. Descargar boletín (scraper)
  2. Buscar keyword en el PDF (pdf_processor)
  3. Interpretar con Claude (ai_interpreter)
  4. Persistir Finding en BD
"""

import logging
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db, Keyword, Finding, FindingStatus
from models import ScanRequest, ScanResponse
from services.scraper import download_bulletin
from services.pdf_processor import process_bulletin
from services.ai_interpreter import interpret_excerpt

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scan", tags=["scan"])


@router.post("/", response_model=ScanResponse)
async def trigger_scan(payload: ScanRequest, db: Session = Depends(get_db)):
    """
    Ejecuta el pipeline de vigilancia para una keyword específica.
    Operación síncrona — para producción mover a tarea Celery/ARQ.
    """
    kw = db.query(Keyword).filter(Keyword.id == payload.keyword_id).first()
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword no encontrada.")

    # Parsear fecha
    scan_date: date
    if payload.bulletin_date:
        try:
            scan_date = date.fromisoformat(payload.bulletin_date)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Formato de fecha inválido. Use YYYY-MM-DD.",
            )
    else:
        scan_date = date.today()

    # ── 1. Descargar boletín ─────────────────────────────────────────────────
    try:
        pdf_path = await download_bulletin(scan_date)
    except Exception as exc:
        logger.error(f"Error descargando boletín: {exc}")
        raise HTTPException(status_code=502, detail=f"Error descargando boletín: {exc}")

    # ── 2. Buscar en PDF ─────────────────────────────────────────────────────
    excerpts = process_bulletin(pdf_path, kw.term)

    if not excerpts:
        # Registrar hallazgo negativo para trazabilidad
        not_found = Finding(
            keyword_id=kw.id,
            bulletin_date=scan_date.isoformat(),
            pdf_path=pdf_path,
            status=FindingStatus.NOT_FOUND,
        )
        db.add(not_found)
        db.commit()
        return ScanResponse(
            keyword_id=kw.id,
            keyword_term=kw.term,
            findings_created=0,
            message=f"No se encontró '{kw.term}' en el boletín del {scan_date}.",
        )

    # ── 3. Interpretar con IA y persistir ────────────────────────────────────
    created = 0
    for excerpt_result in excerpts:
        ai = await interpret_excerpt(excerpt_result.excerpt)

        finding = Finding(
            keyword_id=kw.id,
            bulletin_date=scan_date.isoformat(),
            bulletin_url=None,  # TODO: capturar URL real del scraper
            pdf_path=pdf_path,
            juzgado=excerpt_result.juzgado,
            expediente=excerpt_result.expediente,
            raw_excerpt=excerpt_result.excerpt,
            ai_summary=ai.summary,
            ai_interpretation=ai.interpretation,
            status=FindingStatus.FOUND,
        )
        db.add(finding)
        created += 1

    db.commit()
    logger.info(f"Scan completado: {created} hallazgo(s) para '{kw.term}' ({scan_date}).")

    return ScanResponse(
        keyword_id=kw.id,
        keyword_term=kw.term,
        findings_created=created,
        message=f"Se encontraron {created} mención(es) de '{kw.term}' en el boletín del {scan_date}.",
    )


@router.post("/all", response_model=list[ScanResponse])
async def scan_all_keywords(
    bulletin_date: str | None = None,
    db: Session = Depends(get_db),
):
    """
    Dispara el pipeline para TODAS las keywords registradas.
    Útil para ejecución programada (cron diario).
    """
    keywords = db.query(Keyword).all()
    if not keywords:
        return []

    results = []
    for kw in keywords:
        req = ScanRequest(keyword_id=kw.id, bulletin_date=bulletin_date)
        result = await trigger_scan(req, db)
        results.append(result)

    return results
