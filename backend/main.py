"""
LegalTech Monitor — API Backend
FastAPI + SQLAlchemy + Claude 3.5 Sonnet

Arrancar con:
  uvicorn main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import init_db
from routers import keywords, findings, scan

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Inicializando base de datos...")
    init_db()
    logger.info("Base de datos lista.")
    yield
    logger.info("Apagando servidor.")


app = FastAPI(
    title="LegalTech Judicial Monitor",
    description=(
        "Plataforma de vigilancia judicial automatizada para México. "
        "Monitorea boletines judiciales y usa IA para interpretar hallazgos."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS — ajustar orígenes en producción ────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(keywords.router, prefix="/api/v1")
app.include_router(findings.router, prefix="/api/v1")
app.include_router(scan.router, prefix="/api/v1")


@app.get("/", tags=["health"])
async def root():
    return {
        "service": "LegalTech Judicial Monitor API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
