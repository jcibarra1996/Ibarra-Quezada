# Estructura del tracker de pipeline

Trabajo interno no facturable. El tracker real (hoja de cálculo o tabla en
la herramienta que use JC) sigue esta estructura de columnas; este archivo
es solo la plantilla de campos, no el tracker con datos vivos.

| Campo | Qué captura | Quién lo llena |
|---|---|---|
| Nombre / Empresa | Prospecto | Camila, tras la llamada de Diego |
| Línea identificada | Constitución / Contratos / Cumplimiento laboral | Diego |
| Fecha de llamada | Fecha de descubrimiento | Camila |
| Urgencia | Sí/No → define SLA de 24h | Diego |
| Señales de upsell | Gobierno corporativo / M&A / Legal Ops, anotadas sin ofrecer | Diego |
| Fecha límite de propuesta | Fecha de llamada + 48h o + 24h hábiles | Camila (calculado) |
| Estado de propuesta | Enviada / Pendiente / Vencida | Camila |
| Estado de Carta de Honorarios | Enviada / Firmada / Pendiente | Valentina |
| Estado del prospecto | Prospecto / Cliente activo / Descartado | Valentina (al cerrar) |
| Notas | Cualquier contexto relevante que no calce en otra columna | Todos |

## Regla de alerta

Si "Fecha límite de propuesta" pasa sin que "Estado de propuesta" diga
"Enviada", Camila lo marca como vencida y lo reporta a Gustavo — no lo deja
pasar en silencio.
