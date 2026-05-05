# LegalTech Judicial Monitor — MVP

Plataforma de vigilancia judicial automatizada para México.
Monitorea el **Boletín Judicial de la CDMX**, encuentra menciones de personas o razones sociales y usa **Claude 3.5 Sonnet** para resumir e interpretar cada hallazgo.

---

## Arquitectura

```
.
├── backend/                   # Python · FastAPI · SQLAlchemy
│   ├── main.py                # Entry point (uvicorn)
│   ├── database.py            # Modelos SQLAlchemy + SQLite
│   ├── models.py              # Schemas Pydantic
│   ├── requirements.txt
│   ├── routers/
│   │   ├── keywords.py        # CRUD palabras/razones sociales
│   │   ├── findings.py        # Lectura de hallazgos
│   │   └── scan.py            # Pipeline scraping → PDF → IA
│   └── services/
│       ├── scraper.py         # Playwright — descarga boletín CDMX
│       ├── pdf_processor.py   # PyMuPDF — extracción de texto
│       └── ai_interpreter.py  # Anthropic Claude — resumen legal
│
└── frontend/                  # TypeScript · Next.js 14 · Tailwind
    ├── pages/
    │   └── index.tsx          # Dashboard principal
    └── components/
        ├── KeywordForm.tsx    # Formulario de alta de términos
        └── AlertsTable.tsx    # Tabla de alertas con IA expandible
```

---

## Inicio rápido

### 1. Clonar y configurar variables de entorno

```bash
git clone https://github.com/jcibarra1996/ibarra-quezada.git
cd ibarra-quezada
cp .env.example .env
# Edita .env y agrega tu ANTHROPIC_API_KEY
```

### 2. Backend

```bash
cd backend

# Crear entorno virtual
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Instalar browsers de Playwright (solo primera vez)
playwright install chromium

# Arrancar servidor
uvicorn main:app --reload --port 8000
```

API disponible en: `http://localhost:8000`
Documentación interactiva: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App disponible en: `http://localhost:3000`

---

## API Reference

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/v1/keywords/` | Agregar término a vigilar |
| `GET`  | `/api/v1/keywords/` | Listar términos (filtra por `user_id`) |
| `DELETE` | `/api/v1/keywords/{id}` | Eliminar término |
| `GET`  | `/api/v1/findings/` | Listar hallazgos (filtra por `keyword_id`, `status`) |
| `POST` | `/api/v1/scan/` | Ejecutar scan para un término |
| `POST` | `/api/v1/scan/all` | Ejecutar scan para todos los términos |

---

## Pipeline de vigilancia

```
[Cron / Manual]
      │
      ▼
scraper.py          → Descarga PDF del boletín CDMX con Playwright
      │                (modo simulación si el sitio no responde)
      ▼
pdf_processor.py    → Extrae texto con PyMuPDF, localiza keyword,
      │                captura fragmento + juzgado + expediente
      ▼
ai_interpreter.py   → Envía fragmento a Claude 3.5 Sonnet
      │                Retorna: resumen + interpretación procesal
      ▼
database.py         → Persiste Finding en SQLite
      │
      ▼
Frontend            → Muestra alertas con estado, juzgado, expediente,
                       resumen e interpretación expandible
```

### Prompt de IA

```
"Eres un abogado experto en derecho procesal mexicano con 20 años de experiencia
litigando en juzgados civiles, familiares y mercantiles de la Ciudad de México..."
```

Responde en JSON estructurado:
- `resumen` — qué ocurrió procesalmente (2-3 oraciones)
- `interpretacion` — acción legal recomendada, plazos y riesgo de inacción

---

## Completar el scraper real

El archivo `backend/services/scraper.py` contiene el esqueleto Playwright.
Para conectarlo al portal real del TSJ CDMX:

1. Inspeccionar `https://www.poderjudicialcdmx.gob.mx/boletin-judicial/`
2. Identificar el selector CSS del enlace al PDF del día
3. Reemplazar el selector en `_playwright_download()`:

```python
pdf_link = page.locator("a.TU_SELECTOR_REAL[href*='.pdf']").first
```

---

## Roadmap post-MVP

- [ ] Autenticación JWT multi-usuario
- [ ] Worker asíncrono (Celery + Redis) para scans programados
- [ ] Soporte para otros tribunales (TFJA, SCJN, tribunales locales)
- [ ] Notificaciones por email/WhatsApp al encontrar menciones
- [ ] OCR para PDFs escaneados (Tesseract)
- [ ] PostgreSQL + migraciones Alembic
- [ ] Despliegue Docker Compose
