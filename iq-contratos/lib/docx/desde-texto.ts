// Convierte texto de contrato en un Word sencillo: encabezados de bloque centrados,
// encabezados de cláusula en negritas y los datos pendientes resaltados.
import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";

const FUENTE = "Times New Roman";
const TAMANO = 24;
const RE_ENCABEZADO = /^(DECLARACIONES|CLÁUSULAS|ANTECEDENTES)$/;
const RE_CLAUSULA = /^((?:[A-ZÁÉÍÓÚ]+(?: [A-ZÁÉÍÓÚ]+)?)\.-\s*[A-ZÁÉÍÓÚÑ ,]+\.)/;

function corridas(texto: string, negrita = false): TextRun[] {
  return texto
    .split(/(\[PENDIENTE: [^\]]+\])/)
    .filter(Boolean)
    .map((t) =>
      t.startsWith("[PENDIENTE:")
        ? new TextRun({ text: t, bold: true, highlight: "yellow", font: FUENTE, size: TAMANO })
        : new TextRun({ text: t, bold: negrita, font: FUENTE, size: TAMANO }),
    );
}

export function textoADocx(texto: string, titulo = "Contrato"): Promise<Buffer> {
  const bloques = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const parrafos = bloques.map((b) => {
    if (RE_ENCABEZADO.test(b)) {
      return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 }, children: corridas(b, true) });
    }
    const lineas = b.split("\n");
    if (lineas.length > 1) {
      // Bloques de firma: renglones cortos, alineados a la izquierda.
      return new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 200 },
        children: lineas.flatMap((l, i) => (i > 0 ? [new TextRun({ text: "", break: 1, font: FUENTE, size: TAMANO }), ...corridas(l)] : corridas(l))),
      });
    }
    const m = b.match(RE_CLAUSULA);
    const hijos = m ? [...corridas(m[1], true), ...corridas(b.slice(m[1].length))] : corridas(b);
    return new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200, line: 300 }, children: hijos });
  });
  return Packer.toBuffer(new Document({ title: titulo, styles: { default: { document: { run: { font: FUENTE, size: TAMANO } } } }, sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1700, right: 1700 } } }, children: parrafos }] }));
}
