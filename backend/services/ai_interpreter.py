"""
Integración con la API de Anthropic — Claude 3.5 Sonnet.

Responsabilidades:
  - Recibir un fragmento de boletín judicial.
  - Devolver: resumen + interpretación de acción legal siguiente.

Prompt diseñado para abogados procesalistas mexicanos.
"""

import logging
import os
from dataclasses import dataclass

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 1024

SYSTEM_PROMPT = (
    "Eres un abogado experto en derecho procesal mexicano con 20 años de experiencia "
    "litigando en juzgados civiles, familiares y mercantiles de la Ciudad de México. "
    "Analizas extractos de boletines judiciales con precisión técnica y claridad."
)

USER_PROMPT_TEMPLATE = """\
Se encontró la siguiente mención en el Boletín Judicial de la CDMX:

---
{excerpt}
---

Analiza este extracto y responde en formato JSON estricto con exactamente estas dos llaves:
{{
  "resumen": "<resumen breve en 2-3 oraciones de qué ocurrió procesalmente>",
  "interpretacion": "<qué acción legal debe tomar el cliente ahora, plazos relevantes y riesgo si no actúa>"
}}

No incluyas texto fuera del JSON.
"""


@dataclass
class AIInterpretation:
    summary: str
    interpretation: str


async def interpret_excerpt(excerpt: str) -> AIInterpretation:
    """
    Envía el fragmento a Claude y retorna resumen + interpretación.

    Args:
        excerpt: Texto extraído del boletín que contiene la keyword.

    Returns:
        AIInterpretation con los campos 'summary' e 'interpretation'.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "ANTHROPIC_API_KEY no configurada. Revisa tu archivo .env"
        )

    try:
        import anthropic
        import json

        client = anthropic.AsyncAnthropic(api_key=api_key)

        message = await client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": USER_PROMPT_TEMPLATE.format(excerpt=excerpt[:3000]),
                }
            ],
        )

        raw = message.content[0].text.strip()

        # Limpiar posibles bloques de código markdown
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        parsed = json.loads(raw)
        return AIInterpretation(
            summary=parsed.get("resumen", ""),
            interpretation=parsed.get("interpretacion", ""),
        )

    except Exception as exc:
        logger.exception(f"Error en la interpretación de IA: {exc}")
        return AIInterpretation(
            summary="Error al procesar con IA.",
            interpretation=str(exc),
        )
