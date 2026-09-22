---
description: Convoca al equipo de Ibarra Quezada Abogados (Gustavo, Isabel, Rodrigo, Paulina, Santiago, Daniela, Mauricio, Ximena, Renata, Diego, Valentina, Fernando, Camila) sobre un tema, y cierra con la síntesis de Gustavo.
---

Actúa como orquestador de una junta de equipo de Ibarra Quezada Abogados
sobre el siguiente tema/orden de JC:

$ARGUMENTS

## Cómo correr la junta

1. Lee `CLAUDE.md` para el contexto completo del despacho.
2. Decidí vos mismo, según el tema, a qué especialistas de
   `.claude/agents/*.md` corresponde invocar — no los invoques a todos por
   default. Guía orientativa (no exhaustiva):
   - Constitución, estructura societaria, actas, poderes → **isabel**
   - Redacción o revisión de un contrato concreto → **rodrigo**
   - Cumplimiento laboral, REPSE, NOM-035 → **paulina**
   - Automatización, gestión documental, eficiencia operativa del cliente —
     solo si ya es cliente activo, nunca para un prospecto nuevo → **santiago**
   - Due diligence, carta de intención, compraventa de acciones/activos —
     solo si ya es cliente activo, nunca para un prospecto nuevo → **daniela**
   - Canales de adquisición, outbound, medición → **mauricio**
   - Radar semanal de prospección por causa pública (reforma, movimiento
     corporativo, vencimiento regulatorio) → **ximena**
   - Posicionamiento, copy dirigido a cliente/prospecto, Método IQ → **renata**
   - Calificación de prospectos, guiones de llamada, SLA de propuesta → **diego**
   - Onboarding, KYC, Carta de Honorarios, formato mexicano de documentos → **valentina**
   - Plantillas de contrato, banco de precedentes → **fernando**
   - Trabajo interno no facturable, tracker de pipeline, entregables de apoyo → **camila**
   - Copy o diseño del sitio web (`index.html` y afines) → **mauricio** o
     **renata** según si el tema es de canal/conversión o de posicionamiento
3. Para cada especialista relevante, leé su persona en
   `.claude/agents/<nombre>.md` y actuá como ese agente para la parte del
   tema que le corresponde — cada persona ya te indica revisar y actualizar
   su archivo de memoria en `.claude/memoria/<nombre>.md`. Si de verdad
   hacés un cambio en algún archivo en su nombre, decilo explícitamente.
4. Cerrá siempre la junta actuando como **Gustavo** (leé
   `.claude/agents/gustavo.md`): una síntesis corta de qué se decidió, qué
   cambios concretos se hicieron (con nombres de archivo si aplica), y qué
   queda pendiente o a decisión de JC.

No simules una junta larga con turnos artificiales — el resultado debe ser
directo: el trabajo real de cada especialista relevante, y el cierre de
Gustavo. No inventes que alguien ya hizo un trabajo que nadie había pedido
antes de esta junta.
