import { readFileSync } from "node:fs";
import path from "node:path";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from "docx";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { textoADocx } from "@/lib/docx/desde-texto";
import { extraerTextoDocx } from "@/lib/parsing/extraer-docx";
import { bloquesDesdeHtml, pdfDesdeWord } from "@/lib/pdf/desde-word";

const palabras = (s: string) => s.split(/\s+/).filter(Boolean);

async function textoDelPdf(pdf: Buffer) {
  const doc = await getDocumentProxy(new Uint8Array(pdf));
  const { text } = await extractText(doc, { mergePages: true });
  return { texto: text as string, paginas: doc.numPages };
}

describe("Word a PDF para firma", () => {
  it.each(["01-suministro-proveedor-xyz.txt", "03-arrendamiento-oficinas.txt"])("conserva el texto de %s palabra por palabra", async (archivo) => {
    const original = readFileSync(path.join(__dirname, "../supabase/seed/contratos", archivo), "utf8");
    const word = await textoADocx(original, "Contrato");
    const pdf = await pdfDesdeWord(word, "Contrato");
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const { texto, paginas } = await textoDelPdf(pdf);
    expect(paginas).toBeGreaterThan(1);
    const delWord = (await extraerTextoDocx(word)).replace(/[\u00a0]/g, " ");
    // Sin la paginación, el PDF dice lo mismo que el Word con los mismos espacios entre
    // palabras (una palabra encimada con la siguiente aparecería pegada).
    expect(palabras(texto.replace(/Página \d+ de \d+/g, ""))).toEqual(palabras(delWord));
  });

  it("lleva las tablas (bloques de firmas) y numera las páginas", async () => {
    const celda = (t: string) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })] });
    const word = await Packer.toBuffer(
      new Document({
        sections: [
          {
            children: [
              new Paragraph("CONTRATO DE PRUEBA"),
              new Paragraph({ children: [new TextRun({ text: "PRIMERA.- ", bold: true }), new TextRun("Objeto del contrato — con raya larga y ñandú.")] }),
              new Table({ rows: [new TableRow({ children: [celda("EL CLIENTE"), celda("EL PROVEEDOR")] })] }),
            ],
          },
        ],
      }),
    );
    const { texto } = await textoDelPdf(await pdfDesdeWord(word, "Prueba"));
    expect(texto).toContain("EL CLIENTE");
    expect(texto).toContain("EL PROVEEDOR");
    expect(texto).toContain("ñandú");
    expect(texto).toContain("Página 1 de 1");
  });

  it("marca como encabezado el título y las secciones en mayúsculas", () => {
    const b = bloquesDesdeHtml("<p>CONTRATO DE SUMINISTRO</p><p>Texto del proemio que es largo.</p><p>DECLARACIONES</p><p><strong>PRIMERA.-</strong> Objeto.</p>");
    expect(b.map((x) => x.tipo === "parrafo" && Boolean(x.centrado))).toEqual([true, false, true, false]);
    const primera = b[3];
    expect(primera.tipo === "parrafo" && primera.fragmentos[0]).toMatchObject({ texto: "PRIMERA.-", negrita: true });
  });
});
