import mammoth from "mammoth";

// Word no tiene páginas fijas: se devuelve un solo bloque y el parser genera páginas virtuales.
export async function extraerTextoDocx(datos: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer: datos });
  return value;
}
