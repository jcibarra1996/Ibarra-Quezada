import { estructurar, type DocumentoEstructurado } from "./clausulas";
import { extraerPaginasPdf } from "./extraer-pdf";
import { extraerTextoDocx } from "./extraer-docx";

export const MIME_PDF = "application/pdf";
export const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const TAMANO_MAXIMO = 20 * 1024 * 1024;
const CARACTERES_POR_PAGINA = 3200;

export class ErrorDocumento extends Error {}

export function detectarTipo(nombre: string, datos: Uint8Array): typeof MIME_PDF | typeof MIME_DOCX {
  // Se confía en la firma del archivo, no en la extensión.
  const firma = Buffer.from(datos.subarray(0, 5)).toString("latin1");
  if (firma === "%PDF-") return MIME_PDF;
  if (firma.startsWith("PK") && /\.docx$/i.test(nombre)) return MIME_DOCX;
  if (/\.doc$/i.test(nombre)) throw new ErrorDocumento("El formato .doc (Word 97-2003) no es compatible. Guarde el archivo como .docx o PDF.");
  throw new ErrorDocumento("Solo se aceptan archivos PDF o Word (.docx).");
}

export async function leerContrato(nombre: string, datos: Buffer): Promise<{ mime: string; doc: DocumentoEstructurado }> {
  if (datos.byteLength > TAMANO_MAXIMO) throw new ErrorDocumento("El archivo supera el límite de 20 MB.");
  const mime = detectarTipo(nombre, datos);
  let doc: DocumentoEstructurado;
  try {
    if (mime === MIME_PDF) {
      const paginas = await extraerPaginasPdf(new Uint8Array(datos));
      doc = estructurar(paginas, { reflujo: true });
    } else {
      const texto = await extraerTextoDocx(datos);
      doc = estructurar([texto], { caracteresPorPaginaVirtual: CARACTERES_POR_PAGINA });
    }
  } catch (e) {
    if (e instanceof ErrorDocumento) throw e;
    throw new ErrorDocumento("No fue posible leer el archivo. Verifique que no esté dañado ni protegido con contraseña.");
  }
  if (doc.texto.replace(/\s/g, "").length < 200) {
    throw new ErrorDocumento(
      "El documento no contiene texto seleccionable. Parece un PDF escaneado; esta versión no aplica reconocimiento óptico (OCR).",
    );
  }
  return { mime, doc };
}
