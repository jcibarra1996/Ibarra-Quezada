"""
Scraper del Boletín Judicial de la CDMX.

URL oficial del Tribunal Superior de Justicia de la Ciudad de México:
  https://www.poderjudicialcdmx.gob.mx/boletin-judicial/

Flujo:
  1. Navegar a la página del boletín del día.
  2. Encontrar el enlace al PDF del boletín.
  3. Descargarlo en /tmp/bulletins/<fecha>.pdf
  4. Retornar la ruta local.

NOTA MVP: si la descarga real falla (sitio caído, captcha, etc.),
la función cae en modo SIMULACIÓN y genera un PDF de prueba con
texto de ejemplo que contiene términos legales ficticios.
"""

import os
import logging
from datetime import date, datetime
from pathlib import Path

logger = logging.getLogger(__name__)

DOWNLOAD_DIR = Path(os.getenv("BULLETIN_DIR", "/tmp/bulletins"))
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

# URL base del boletín CDMX (esqueleto — ajustar cuando se tenga acceso real)
BOLETIN_BASE_URL = "https://www.poderjudicialcdmx.gob.mx/boletin-judicial/"


async def download_bulletin(target_date: date | None = None) -> str:
    """
    Descarga el boletín judicial del día indicado.

    Args:
        target_date: Fecha del boletín. Por defecto: hoy.

    Returns:
        Ruta absoluta al PDF descargado.
    """
    if target_date is None:
        target_date = date.today()

    pdf_path = DOWNLOAD_DIR / f"boletin_{target_date.isoformat()}.pdf"

    # Si ya lo descargamos hoy, reutilizamos
    if pdf_path.exists():
        logger.info(f"Boletín {target_date} ya existe en caché: {pdf_path}")
        return str(pdf_path)

    # ── Intento de descarga real con Playwright ──────────────────────────────
    try:
        pdf_path_str = await _playwright_download(target_date, pdf_path)
        return pdf_path_str
    except Exception as exc:
        logger.warning(
            f"Descarga real falló ({exc}). Generando PDF de simulación para MVP."
        )
        return await _generate_simulation_pdf(target_date, pdf_path)


async def _playwright_download(target_date: date, dest: Path) -> str:
    """
    Navega al portal del TSJ CDMX y descarga el PDF del boletín.

    TODO: ajustar selectores CSS/XPath una vez confirmados con el sitio real.
    El portal puede requerir aceptar cookies o navegar por un calendario.
    """
    from playwright.async_api import async_playwright

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()

        logger.info(f"Navegando a {BOLETIN_BASE_URL}")
        await page.goto(BOLETIN_BASE_URL, timeout=30_000)

        # ── ESQUELETO: ajustar según estructura HTML real del portal ──────────
        # Ejemplo de selector hipotético:
        #   <a class="boletin-link" href="/boletin/2024-06-15.pdf">Boletín 15 Jun 2024</a>
        #
        # Estrategia 1: buscar enlace que contenga la fecha formateada en español
        date_str_es = target_date.strftime("%d/%m/%Y")
        pdf_link = page.locator(f"a[href*='.pdf']").first

        async with context.expect_page() as _:
            download = await context.expect_event("download")
            await pdf_link.click()

        dl = await download.value
        await dl.save_as(str(dest))
        await browser.close()

        logger.info(f"PDF descargado en {dest}")
        return str(dest)


async def _generate_simulation_pdf(target_date: date, dest: Path) -> str:
    """
    Genera un PDF de prueba con texto legal ficticio para demo / CI.
    Requiere pymupdf.
    """
    import fitz  # PyMuPDF

    doc = fitz.open()
    page = doc.new_page()

    sample_text = f"""TRIBUNAL SUPERIOR DE JUSTICIA DE LA CIUDAD DE MÉXICO
BOLETÍN JUDICIAL — {target_date.strftime("%d de %B de %Y").upper()}
════════════════════════════════════════════════════════════

JUZGADO DÉCIMO SEGUNDO DE LO CIVIL — RECLUSORIO NORTE
Expediente: 0142/2024
Se hace saber a CONSTRUCTORA IBARRA QUEZADA S.A. DE C.V. que por auto
de esta fecha, se admitió la demanda en su contra en juicio ordinario
civil por daños y perjuicios, señalándose el día quince del mes en
curso para la audiencia previa de conciliación. Notifíquese.

────────────────────────────────────────────────────────────
JUZGADO VIGÉSIMO TERCERO FAMILIAR — CDMX
Expediente: 0987/2024
En el juicio de divorcio promovido, se cita a CARLOS MENDOZA REYES
para que dentro de NUEVE DÍAS comparezca a juicio, bajo apercibimiento
de ser declarado en rebeldía. El juzgado ordena embargo precautorio
sobre bienes del demandado hasta por la cantidad de $500,000 M.N.

────────────────────────────────────────────────────────────
DÉCIMO JUZGADO DE DISTRITO EN MATERIA CIVIL — CDMX
Expediente: 3301-B/2024
EMPRESA DE TRANSPORTES RÁPIDOS DEL SUR S.A. DE C.V.: Se le hace saber
que el juicio ejecutivo mercantil sigue su curso; se ordena remate en
primera almoneda de bienes embargados. Fecha de remate: 20/07/2024.

════════════════════════════════════════════════════════════
FIN DEL BOLETÍN — SIMULACIÓN MVP
"""

    page.insert_text(
        (50, 50),
        sample_text,
        fontsize=9,
        fontname="helv",
    )

    doc.save(str(dest))
    doc.close()

    logger.info(f"PDF de simulación generado en {dest}")
    return str(dest)
