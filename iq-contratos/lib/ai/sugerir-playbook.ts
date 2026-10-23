import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { env } from "@/lib/env";
import { TIPOS_CONTRATO, type TipoContrato } from "@/lib/tipos";
import { limpiarSugerencias, RespuestaSchema, type SugerenciaPosicion } from "./sugerencia-playbook";
import { registrarUso } from "./uso";

// Sugerencias de la IA para el playbook: qué se prefiere, qué se acepta como respaldo y qué
// nunca se acepta en cada tema. Nada se guarda solo: la dirección jurídica revisa, ajusta y
// decide qué entra al playbook.

export class ErrorSugerencia extends Error {}

const INSTRUCCIONES = `Usted es un abogado corporativo mexicano con amplia experiencia en contratos mercantiles y civiles. Ayuda a la dirección jurídica de una empresa a armar su playbook: para cada tema de un tipo de contrato, la posición preferida, la posición de respaldo aceptable y lo que nunca se acepta, más una cláusula modelo aprobable. Lo que usted entregue es una propuesta; la dirección jurídica la revisa y decide qué adopta.

Criterios:
- Escriba desde la posición de la empresa que usa el playbook. Si el tema depende de si la empresa es quien paga o quien presta (por ejemplo, intereses moratorios o penas convencionales), dígalo en la posición y proponga lo que conviene a la empresa en el papel más común para ese tipo de contrato.
- Sea concreto y operable: un abogado debe poder comparar una cláusula contra la posición y decidir. Evite generalidades como "condiciones razonables".
- Derecho mexicano y estructura mexicana: declaraciones y cláusulas, jurisdicción y ley aplicable mexicanas. Nunca use terminología de common law ("Agreement", "Whereas", "Indemnification" y similares).
- Cláusula modelo: redacción completa y lista para usarse, con términos definidos genéricos y datos variables entre corchetes.

Rigor:
- Nunca invente leyes, artículos, normas ni criterios judiciales. No cite números de artículo. Si una posición se apoya en una ley, nómbrela de forma general en referencias_normativas.
- Si una posición depende de un dato que usted no puede saber (políticas internas, montos, apetito de riesgo), dígalo en por_verificar en lugar de suponerlo.
- No dramatice con montos de multas ni con casos de terceros.
- No use rayas largas (em dash) en ningún texto.`;

interface Existente {
  tema: string;
  preferida: string;
  respaldo: string;
  nunca_se_acepta: string;
}

export async function sugerirPosiciones(p: {
  tipo: TipoContrato;
  organizacion: string;
  existentes: Existente[];
  // Con tema: una sola posición para ese tema, partiendo del borrador si lo hay. Sin tema:
  // temas que al playbook le faltan.
  tema?: string;
  borrador?: Partial<Existente> & { clausula_modelo?: string };
}): Promise<SugerenciaPosicion[]> {
  const tipo = TIPOS_CONTRATO[p.tipo];
  const lista = p.existentes.length
    ? p.existentes.map((e) => `- ${e.tema}\n  Preferida: ${e.preferida || "sin definir"}\n  Respaldo: ${e.respaldo || "sin definir"}\n  Nunca se acepta: ${e.nunca_se_acepta || "sin definir"}`).join("\n")
    : "(el playbook todavía no tiene posiciones)";
  const borrador = p.borrador
    ? Object.entries(p.borrador)
        .filter(([, v]) => typeof v === "string" && v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    : "";
  const pedido = p.tema
    ? `Proponga una sola posición para el tema "${p.tema}".${borrador ? ` Parta de este borrador de la dirección jurídica; conserve lo que esté bien y complete o mejore lo demás:\n${borrador}` : ""}`
    : "Proponga de tres a seis temas importantes para este tipo de contrato que el playbook todavía no cubre. No repita ni reformule los temas existentes.";

  const cliente = new Anthropic({ apiKey: env.anthropicKey(), timeout: 4 * 60 * 1000 });
  const stream = cliente.beta.messages.stream({
    model: env.modelo(),
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: env.esfuerzo("sugerencias"), format: betaZodOutputFormat(RespuestaSchema) },
    system: INSTRUCCIONES,
    messages: [
      {
        role: "user",
        content: `Empresa: ${p.organizacion}\nTipo de contrato: ${tipo}\n\nPosiciones actuales del playbook:\n${lista}\n\n${pedido}`,
      },
    ],
  });
  const mensaje = await stream.finalMessage();
  registrarUso("sugerencias", mensaje.usage, { tema: p.tema ? 1 : 0 });
  if (mensaje.stop_reason === "refusal") throw new ErrorSugerencia("El modelo declinó proponer posiciones. Intente con otro tema.");
  if (mensaje.stop_reason === "max_tokens") throw new ErrorSugerencia("La propuesta quedó incompleta. Intente de nuevo.");
  const texto = mensaje.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    throw new ErrorSugerencia("La respuesta del modelo no es válida. Intente de nuevo.");
  }
  const r = RespuestaSchema.safeParse(crudo);
  if (!r.success) throw new ErrorSugerencia("La respuesta del modelo no es válida. Intente de nuevo.");
  return limpiarSugerencias(r.data.posiciones, p.existentes, p.tema);
}
