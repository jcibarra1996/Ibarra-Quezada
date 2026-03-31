"""
Procesador de PDFs usando PyMuPDF (fitz).

Flujo por keyword:
  1. Extraer todo el texto del PDF página a página.
  2. Buscar la keyword (case-insensitive).
  3. Extraer un fragmento de contexto alrededor del match.
  4. Intentar parsear juzgado y número de expediente del fragmento.
  5. Retornar lista de ExcerptResult.
"""

import re
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)

# Cuántos caracteres de contexto alrededor del match
CONTEXT_CHARS = 600

# Regex para capturar número de expediente (formatos comunes en CDMX)
EXPEDIENTE_RE = re.compile(
    r"\b(?:expediente|exp\.?|juicio)\s*[:\s]?\s*(\d{1,6}[/-]\w{1,10}(?:/\d{2,4})?)",
    re.IGNORECASE,
)

# Regex para capturar el nombre del juzgado
JUZGADO_RE = re.compile(
    r"(juzgado\s+[\w\s]+?(?:de\s+lo\s+[\w]+|familiar|civil|penal|mercantil)?(?:\s+de\s+[\w\s]+)?)"
    r"(?=\n|—|–|-|\.|,)",
    re.IGNORECASE,
)


@dataclass
class ExcerptResult:
    keyword: str
    page_number: int
    excerpt: str
    juzgado: str = ""
    expediente: str = ""


def process_bulletin(pdf_path: str, keyword: str) -> List[ExcerptResult]:
    """
    Busca `keyword` en el PDF ubicado en `pdf_path`.

    Args:
        pdf_path: Ruta absoluta al PDF del boletín.
        keyword:  Término a buscar (nombre, razón social, etc.).

    Returns:
        Lista de ExcerptResult; vacía si no se encontró nada.
    """
    path = Path(pdf_path)
    if not path.exists():
        logger.error(f"PDF no encontrado: {pdf_path}")
        return []

    results: List[ExcerptResult] = []

    try:
        import fitz  # PyMuPDF

        doc = fitz.open(str(path))
        keyword_lower = keyword.lower()

        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text")
            text_lower = text.lower()

            start = 0
            while True:
                idx = text_lower.find(keyword_lower, start)
                if idx == -1:
                    break

                # Extraer fragmento de contexto
                ctx_start = max(0, idx - CONTEXT_CHARS // 2)
                ctx_end = min(len(text), idx + len(keyword) + CONTEXT_CHARS // 2)
                excerpt = text[ctx_start:ctx_end].strip()

                # Parsear metadatos del fragmento
                juzgado = _extract_juzgado(excerpt)
                expediente = _extract_expediente(excerpt)

                results.append(
                    ExcerptResult(
                        keyword=keyword,
                        page_number=page_num,
                        excerpt=excerpt,
                        juzgado=juzgado,
                        expediente=expediente,
                    )
                )

                start = idx + len(keyword)

        doc.close()

    except Exception as exc:
        logger.exception(f"Error procesando PDF {pdf_path}: {exc}")

    logger.info(
        f"Búsqueda de '{keyword}' en {path.name}: {len(results)} resultado(s)."
    )
    return results


# ──────────────────────────────────────────────
# Helpers de parseo
# ──────────────────────────────────────────────

def _extract_juzgado(text: str) -> str:
    match = JUZGADO_RE.search(text)
    if match:
        return match.group(1).strip()
    return ""


def _extract_expediente(text: str) -> str:
    match = EXPEDIENTE_RE.search(text)
    if match:
        return match.group(1).strip()
    return ""
