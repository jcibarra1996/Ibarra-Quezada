import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { clienteSistema } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { registrar, registrarError } from "@/lib/log";
import { aplicarFicha, CAMPOS_FICHA, FichaSchema, procesarFicha, type FuentesFicha, type ValoresFicha } from "./ficha-esquema";

export class ErrorFicha extends Error {}

const INSTRUCCIONES = `Usted es un abogado corporativo mexicano. Analiza un contrato y llena su ficha para el registro de contratos de una empresa: tipo, monto, vigencia, renovación, plazo de aviso, ley aplicable y jurisdicción. Un abogado del equipo revisa y confirma la ficha.

Reglas:
- Lea y analice el contrato completo, no solo la cláusula que lleva el nombre del dato: el aviso puede estar en la terminación anticipada, el precio en una cláusula de pago o en un anexo, la vigencia en la renovación.
- Para cada grupo dé el valor que resulta del contrato y explique en analisis, en una oración, cómo lo leyó. Si lo calculó (por ejemplo, el término a partir del inicio y el plazo), dígalo.
- Si el dato no tiene un valor fijo (remite a un anexo que no viene en el documento, es variable, depende de órdenes de compra) o el contrato no lo regula, deje el valor en null y dígalo en analisis, con la cita de la cláusula que lo trata si la hay. Nunca invente ni suponga un dato que el contrato no da.
- No cite artículos de ley por su cuenta; solo lo que el contrato dice.
- Tipo: determínelo leyendo el objeto del contrato, es decir, la obligación principal que asume cada parte, no el título. Criterios:
  - transmitir la propiedad de bienes a cambio de un precio, en una operación: compraventa;
  - entregas periódicas o continuas de bienes a cambio de un precio: suministro;
  - conceder el uso o goce temporal de un bien a cambio de una renta: arrendamiento;
  - realizar actividades o servicios a cambio de una contraprestación: prestacion_servicios;
  - ejecutar o construir una obra determinada: obra;
  - la obligación principal es guardar reserva sobre información: confidencialidad;
  - si no corresponde a ninguno (licencia de uso, mandato, comodato, entre otros): otro.
  Si el contrato combina varias obligaciones, elija la que prevalece y dígalo en razon. Si el título y el objeto no coinciden, prevalece el objeto y señálelo en razon. La cita es la cláusula u oración del objeto; objeto es ese objeto en una oración.
- Monto: la contraprestación principal (precio, renta, honorarios). Si hay varios importes (por ejemplo, renta y depósito en garantía), use el de la contraprestación recurrente o principal. Si el contrato separa el IVA, use el importe sin IVA.
- Renovación: true solo si el contrato se renueva sin necesidad de un nuevo acuerdo; false si requiere un convenio nuevo o el contrato concluye a su término.
- Aviso: los días de anticipación para avisar que no se renovará o para terminar el contrato. En analisis diga para qué es el aviso y quién puede darlo; si solo una de las partes puede terminar anticipadamente o los plazos son distintos para cada parte, señálelo.
- Ley aplicable: solo si el contrato la pacta; si se remite a "las leyes aplicables" sin decir cuáles, o no dice nada, deje el valor en null y dígalo en analisis.
- Para cada grupo, cita es la copia exacta, carácter por carácter, del fragmento continuo del contrato del que sale el dato o su análisis. Sin puntos suspensivos ni paráfrasis. Un valor sin cita no se guarda.
- No use rayas largas (em dash).`;

// Lee la versión vigente y llena la ficha. No pisa lo que Legal capturó a mano.
export async function llenarFicha(p: { contratoId: string; orgId: string; usuarioId: string | null }): Promise<{ campos: number }> {
  const db = clienteSistema();
  const { data: contrato } = await db
    .from("contracts")
    .select(`id, version_actual_id, ficha_fuentes, ficha_confirmada_en, ${CAMPOS_FICHA.join(", ")}`)
    .eq("id", p.contratoId)
    .eq("org_id", p.orgId)
    .maybeSingle();
  if (!contrato) throw new ErrorFicha("Contrato no encontrado.");
  const c = contrato as unknown as ValoresFicha & { id: string; version_actual_id: string | null; ficha_fuentes: FuentesFicha | null; ficha_confirmada_en: string | null };
  if (!c.version_actual_id) throw new ErrorFicha("El contrato no tiene documento.");
  const { data: version } = await db.from("contract_versions").select("texto_extraido").eq("id", c.version_actual_id).single();
  if (!version?.texto_extraido) throw new ErrorFicha("No se encontró el texto del contrato.");

  const cliente = new Anthropic({ apiKey: env.anthropicKey(), timeout: 4 * 60 * 1000 });
  const stream = cliente.beta.messages.stream({
    model: env.modelo(),
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(FichaSchema) },
    system: INSTRUCCIONES,
    messages: [{ role: "user", content: `<contrato>\n${version.texto_extraido}\n</contrato>\n\nLlene la ficha de este contrato.` }],
  });
  const mensaje = await stream.finalMessage();
  if (mensaje.stop_reason === "refusal") throw new ErrorFicha("El modelo declinó leer este contrato. Capture la ficha a mano.");
  const texto = mensaje.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let extraida: ReturnType<typeof procesarFicha>;
  try {
    extraida = procesarFicha(JSON.parse(texto), version.texto_extraido);
  } catch {
    throw new ErrorFicha("La respuesta del modelo no es válida. Intente de nuevo.");
  }

  const { cambios, fuentes, desconfirmar } = aplicarFicha(c, extraida);
  const campos = Object.keys(cambios).length;
  const { error } = await db
    .from("contracts")
    .update({ ...cambios, ficha_fuentes: fuentes, ...(desconfirmar ? { ficha_confirmada_en: null, ficha_confirmada_por: null } : {}) })
    .eq("id", c.id);
  if (error) throw new ErrorFicha("No se pudo guardar la ficha.");
  if (campos) await db.from("audit_events").insert({ org_id: p.orgId, contract_id: c.id, actor_id: p.usuarioId, accion: "ficha_extraida", detalle: { campos } });
  registrar("ficha_extraida", { org: p.orgId, contrato: c.id, campos });
  return { campos };
}

// Para el segundo plano: los errores se registran sin texto del contrato y no se propagan.
export async function llenarFichaSinFallar(p: Parameters<typeof llenarFicha>[0]) {
  try {
    await llenarFicha(p);
  } catch (e) {
    registrarError("ficha_fallida", e, { contrato: p.contratoId });
  }
}
