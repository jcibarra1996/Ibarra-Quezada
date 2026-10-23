import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { env } from "@/lib/env";
import { extraerTextoDocx } from "@/lib/parsing/extraer-docx";
import { MIME_DOCX, MIME_PDF } from "@/lib/parsing/extraer";
import { extraerPaginasPdf } from "@/lib/parsing/extraer-pdf";
import { PDFDocument } from "pdf-lib";
import { paginasSinTexto, seleccionarPaginas, seRecorta, tieneTexto } from "./paginas";
import { ExtraccionSchema, ErrorExtraccion, procesarExtraccion, type ExtraccionLista } from "./esquema";
import { CAMPOS, TIPOS_DOCUMENTO, type TipoDocumento } from "./campos";
import { registrarUso } from "@/lib/ai/uso";

export const VERSION_PROMPT_EXTRACCION = "2026-10-23.3";

const INSTRUCCIONES = `Usted es un abogado corporativo mexicano. Lee un documento corporativo (acta constitutiva, reforma de estatutos, poder notarial, constancia de situación fiscal, identificación oficial o comprobante de domicilio) para integrar el expediente de una de las partes de un contrato. Un abogado del equipo valida cada dato antes de usarlo.

Extraiga únicamente los datos que el documento contiene de forma expresa. Campos posibles:
${CAMPOS.map((c) => `- ${c.clave}: ${c.etiqueta}${c.ayuda ? ` (${c.ayuda})` : ""}`).join("\n")}

Dónde buscar cada dato. Vaya directo a estas secciones; no lea ni resuma lo demás:
- Acta constitutiva (escritura de constitución):
  * Primera hoja o proemio: número de escritura o instrumento (a veces con volumen o libro), fecha, nombre del notario, número de notaría y entidad.
  * Estatutos, normalmente en los primeros artículos o cláusulas: denominación, nacionalidad (cláusula de admisión o exclusión de extranjeros), domicilio y objeto social.
  * Cláusulas transitorias, resoluciones o "nombramientos", casi siempre al final: administrador único o consejo de administración, y el otorgamiento de poderes con el nombre de cada apoderado y sus facultades.
    Si el poder del representante se otorga ahí, dentro de la propia acta, los datos del poder (poder_escritura, poder_fecha, poder_notario, poder_notaria, poder_lugar) son los de esa misma escritura constitutiva: regístrelos así y anótelo en observaciones.
  * Últimas hojas: notas, certificaciones y la boleta o constancia de inscripción en el Registro Público de Comercio con el folio mercantil electrónico. A veces también el RFC.
- Poder notarial:
  * Proemio: número de escritura, fecha, notario, notaría y entidad del poder.
  * Comparecencia y personalidad: quién otorga el poder y con qué instrumento acredita la existencia de la sociedad (puede repetir los datos del acta constitutiva; úselos como datos de constitución solo si se citan completos).
  * Cláusula de otorgamiento: nombre del apoderado, cargo y facultades (pleitos y cobranzas, actos de administración, actos de dominio, títulos de crédito, materia laboral), y cualquier limitación: ejercicio mancomunado o conjunto, montos, plazo, prohibición de sustituir.
- Constancia de situación fiscal: RFC, denominación o razón social, régimen de capital y domicilio fiscal (calle, número, colonia, código postal, municipio o alcaldía, entidad). Anote la fecha de emisión en observaciones.
- Identificación oficial: nombre, tipo de identificación y su folio, clave o número.
- Comprobante de domicilio: dirección completa y fecha de emisión (anótela en observaciones).

Si el documento es largo, solo se le envían las páginas donde normalmente están estos datos, indicadas con su número original. Si un dato no aparece en ellas, no lo suponga: dígalo en observaciones para que Legal lo busque en el original.

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
  if (/^ftyp(heic|heix|mif1|msf1)/.test(Buffer.from(datos.subarray(4, 12)).toString("latin1"))) {
    throw new ErrorExtraccion("Las fotos HEIC del iPhone no son compatibles. Expórtela como JPG o PDF.");
  }
  throw new ErrorExtraccion("Solo se aceptan PDF (también escaneados), Word (.docx) o imágenes JPG y PNG.");
}

// Lee el documento con el modelo. Los PDF escaneados y las fotografías se envían como
// documento o imagen, así que no requieren texto seleccionable.
export async function leerDocumentoCorporativo(p: {
  datos: Buffer;
  mime: string;
  tipoDeclarado: TipoDocumento;
  denominacion: string;
}): Promise<{ extraccion: ExtraccionLista; modelo: string; lectura?: Lectura }> {
  const cliente = new Anthropic({ apiKey: env.anthropicKey(), timeout: 5 * 60 * 1000 });
  const modelo = env.modelo();
  const contenido: Anthropic.Beta.BetaContentBlockParam[] = [];
  let lectura: Lectura = { paginas: null, total: null };
  if (p.mime === MIME_PDF) {
    const r = await prepararPdf(p.datos, p.tipoDeclarado);
    contenido.push(r.bloque);
    lectura = r.lectura;
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
    output_config: { effort: env.esfuerzo("expediente"), format: betaZodOutputFormat(ExtraccionSchema) },
    system: INSTRUCCIONES,
    messages: [{ role: "user", content: contenido }],
  });
  const mensaje = await stream.finalMessage();
  registrarUso("expediente", mensaje.usage, { tipo: p.tipoDeclarado, paginas: lectura.paginas?.length ?? lectura.total ?? null });
  if (mensaje.stop_reason === "refusal") throw new ErrorExtraccion("El modelo declinó leer este documento. Capture los datos manualmente.");
  if (mensaje.stop_reason === "max_tokens") throw new ErrorExtraccion("El documento es demasiado extenso para leerse completo.");
  const texto = mensaje.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    throw new ErrorExtraccion("La respuesta del modelo no es JSON válido.");
  }
  return { extraccion: procesarExtraccion(crudo), modelo, lectura };
}

export interface Lectura {
  // Páginas del original que se mandaron al modelo; null si se mandó completo.
  paginas: number[] | null;
  total: number | null;
}

// Un PDF con texto se manda como texto de las páginas elegidas; uno escaneado, como PDF
// recortado a las primeras y últimas páginas, que es donde suelen estar los datos.
async function prepararPdf(datos: Buffer, tipo: TipoDocumento): Promise<{ bloque: Anthropic.Beta.BetaContentBlockParam; lectura: Lectura }> {
  const completo = (): Anthropic.Beta.BetaContentBlockParam => ({
    type: "document",
    source: { type: "base64", media_type: "application/pdf", data: datos.toString("base64") },
  });
  let textos: string[] = [];
  try {
    textos = await extraerPaginasPdf(new Uint8Array(datos));
  } catch {
    textos = [];
  }
  if (textos.length && tieneTexto(textos)) {
    const paginas = seleccionarPaginas(textos, tipo);
    const recortado = paginas.length < textos.length;
    return {
      bloque: {
        type: "text",
        text:
          (recortado ? `Páginas seleccionadas ${paginas.join(", ")} de un total de ${textos.length}.\n\n` : "") +
          `<documento>\n${paginas.map((n) => `[Página ${n}]\n${textos[n - 1]}`).join("\n\n")}\n</documento>`,
      },
      lectura: { paginas: recortado ? paginas : null, total: textos.length },
    };
  }
  if (!seRecorta(tipo)) return { bloque: completo(), lectura: { paginas: null, total: textos.length || null } };
  try {
    const original = await PDFDocument.load(datos, { ignoreEncryption: true });
    const total = original.getPageCount();
    const paginas = paginasSinTexto(total);
    if (paginas.length === total) return { bloque: completo(), lectura: { paginas: null, total } };
    const recorte = await PDFDocument.create();
    const copias = await recorte.copyPages(original, paginas.map((n) => n - 1));
    copias.forEach((pg) => recorte.addPage(pg));
    const bytes = Buffer.from(await recorte.save());
    return {
      bloque: {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") },
        title: `Páginas ${paginas.join(", ")} de ${total} del original`,
        context: correspondencia(paginas, total),
      },
      lectura: { paginas, total },
    };
  } catch {
    return { bloque: completo(), lectura: { paginas: null, total: null } };
  }
}

// "La página 5 de este PDF es la página 23 del original", para que el modelo no confunda
// la numeración del recorte con la del documento.
export function correspondencia(paginas: number[], total: number): string {
  return (
    `Este PDF es un recorte de ${paginas.length} páginas de un documento de ${total}. Todas las páginas del recorte se recibieron completas. ` +
    paginas.map((n, i) => `La página ${i + 1} de este PDF es la página ${n} del original.`).join(" ") +
    " Reporte siempre el número de página del original."
  );
}
