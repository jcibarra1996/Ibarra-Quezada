import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { env } from "@/lib/env";
import { extraerTextoDocx } from "@/lib/parsing/extraer-docx";
import { MIME_DOCX, MIME_PDF } from "@/lib/parsing/extraer";
import { ExtraccionSchema, ErrorExtraccion, procesarExtraccion, type ExtraccionLista } from "./esquema";
import { CAMPOS, TIPOS_DOCUMENTO, type TipoDocumento } from "./campos";

export const VERSION_PROMPT_EXTRACCION = "2026-10-23.1";

const INSTRUCCIONES = `Usted es un abogado corporativo mexicano. Lee un documento corporativo (acta constitutiva, reforma de estatutos, poder notarial, constancia de situación fiscal, identificación oficial o comprobante de domicilio) para integrar el expediente de una de las partes de un contrato. Un abogado del equipo valida cada dato antes de usarlo.

Extraiga únicamente los datos que el documento contiene de forma expresa. Campos posibles:
${CAMPOS.map((c) => `- ${c.clave}: ${c.etiqueta}${c.ayuda ? ` (${c.ayuda})` : ""}`).join("\n")}

Reglas:
- Nunca deduzca, complete ni corrija un dato. Si no aparece o no es legible, no lo incluya y explíquelo en observaciones.
- Copie nombres, números de escritura, notarías y folios tal como aparecen. Fechas en formato AAAA-MM-DD solo si el documento las fija completas.
- En poderes, describa las facultades con las palabras del instrumento y señale en observaciones si son limitadas, mancomunadas o sujetas a condición.
- El domicilio para efectos del contrato es el que aparece en un comprobante de domicilio, o el domicilio fiscal de la constancia si no hay otro.
- En "cita" copie el fragmento breve del documento de donde sale cada dato.
- No cite artículos de ley. No use rayas largas (em dash).`;

const MIME_IMAGEN = ["image/jpeg", "image/png"] as const;
type MimeImagen = (typeof MIME_IMAGEN)[number];

export function detectarTipoCorporativo(nombre: string, datos: Uint8Array): string {
  const b = Buffer.from(datos.subarray(0, 8));
  if (b.subarray(0, 5).toString("latin1") === "%PDF-") return MIME_PDF;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.subarray(0, 2).toString("latin1") === "PK" && /\.docx$/i.test(nombre)) return MIME_DOCX;
  throw new ErrorExtraccion("Solo se aceptan PDF (también escaneados), Word (.docx) o imágenes JPG y PNG.");
}

// Lee el documento con el modelo. Los PDF escaneados y las fotografías se envían como
// documento o imagen, así que no requieren texto seleccionable.
export async function leerDocumentoCorporativo(p: {
  datos: Buffer;
  mime: string;
  tipoDeclarado: TipoDocumento;
  denominacion: string;
}): Promise<{ extraccion: ExtraccionLista; modelo: string }> {
  const cliente = new Anthropic({ apiKey: env.anthropicKey(), timeout: 5 * 60 * 1000 });
  const modelo = env.modelo();
  const contenido: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (p.mime === MIME_PDF) {
    contenido.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: p.datos.toString("base64") } });
  } else if ((MIME_IMAGEN as readonly string[]).includes(p.mime)) {
    contenido.push({ type: "image", source: { type: "base64", media_type: p.mime as MimeImagen, data: p.datos.toString("base64") } });
  } else if (p.mime === MIME_DOCX) {
    const texto = await extraerTextoDocx(p.datos);
    contenido.push({ type: "text", text: `<documento>\n${texto}\n</documento>` });
  } else {
    throw new ErrorExtraccion("Formato de archivo no compatible.");
  }
  contenido.push({
    type: "text",
    text: `Expediente de: ${p.denominacion}\nQuien lo cargó lo identificó como: ${TIPOS_DOCUMENTO[p.tipoDeclarado]}.\nExtraiga los datos de este documento.`,
  });

  const stream = cliente.beta.messages.stream({
    model: modelo,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(ExtraccionSchema) },
    system: INSTRUCCIONES,
    messages: [{ role: "user", content: contenido }],
  });
  const mensaje = await stream.finalMessage();
  if (mensaje.stop_reason === "refusal") throw new ErrorExtraccion("El modelo declinó leer este documento. Capture los datos manualmente.");
  if (mensaje.stop_reason === "max_tokens") throw new ErrorExtraccion("El documento es demasiado extenso para leerse completo.");
  const texto = mensaje.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    throw new ErrorExtraccion("La respuesta del modelo no es JSON válido.");
  }
  return { extraccion: procesarExtraccion(crudo), modelo };
}
