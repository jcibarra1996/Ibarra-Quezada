import mammoth from "mammoth";

const ENTIDADES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

// Se convierte a HTML y luego a texto para conservar los saltos de línea dentro de un
// párrafo (por ejemplo, en los bloques de firmas), que la extracción de texto plano pierde.
// Word no tiene páginas fijas: el parser genera páginas virtuales.
export async function extraerTextoDocx(datos: Buffer): Promise<string> {
  const { value: html } = await mammoth.convertToHtml({ buffer: datos });
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|li|tr|table)>/gi, "\n\n")
    .replace(/<\/t[dh]>/gi, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (e) => ENTIDADES[e])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
