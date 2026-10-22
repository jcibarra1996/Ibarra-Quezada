// Genera la contrapropuesta en Word con control de cambios real (w:ins / w:del),
// atribuido a la persona que aceptó o editó cada cambio. No incluye explicaciones
// internas ni comentarios de la IA: es el documento que recibe la contraparte.

import {
  AlignmentType,
  DeletedTextRun,
  Document,
  Footer,
  Header,
  InsertedTextRun,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from "docx";
import { diferencias } from "@/lib/revision/diferencias";
import { numeroAOrdinal, ordinalANumero } from "@/lib/parsing/clausulas";

export interface SeccionDoc {
  tipo: string;
  etiqueta: string;
  titulo: string | null;
  texto: string;
  inicio: number;
  fin: number;
}

export interface Cambio {
  inicio: number;
  fin: number;
  nuevo: string;
  autor: string;
  fecha: string;
}

export interface ClausulaNueva {
  texto: string;
  autor: string;
  fecha: string;
}

const FUENTE = "Times New Roman";
const TAMANO = 24; // medios puntos: 12 pt

type Pieza = { tipo: "igual"; texto: string; negrita?: boolean } | { tipo: "cambio"; original: string; nuevo: string; autor: string; fecha: string };

// Divide una sección en tramos sin cambio y tramos con cambio.
export function piezasDeSeccion(s: SeccionDoc, cambios: Cambio[]): Pieza[] {
  const propios = cambios
    .filter((c) => c.inicio >= s.inicio && c.inicio < s.fin)
    .sort((a, b) => a.inicio - b.inicio);
  const piezas: Pieza[] = [];
  let cursor = s.inicio;
  for (const c of propios) {
    if (c.inicio < cursor) continue; // traslapado con un cambio anterior
    if (c.inicio > cursor) piezas.push({ tipo: "igual", texto: s.texto.slice(cursor - s.inicio, c.inicio - s.inicio) });
    const fin = Math.min(c.fin, s.fin);
    piezas.push({ tipo: "cambio", original: s.texto.slice(c.inicio - s.inicio, fin - s.inicio), nuevo: c.nuevo, autor: c.autor, fecha: c.fecha });
    cursor = fin;
  }
  if (cursor < s.fin) piezas.push({ tipo: "igual", texto: s.texto.slice(cursor - s.inicio) });
  return piezas;
}

// Largo del encabezado de una cláusula ("QUINTA.- INTERESES MORATORIOS.") para ponerlo en negritas.
function largoEncabezado(s: SeccionDoc): number {
  if (s.tipo !== "clausula") return 0;
  const inicio = s.texto.slice(0, 220);
  if (s.titulo) {
    const i = inicio.indexOf(s.titulo);
    if (i >= 0) {
      const sep = inicio.slice(i + s.titulo.length).match(/^\s*(?:\.-|\.–|[.:])?\s*/);
      return i + s.titulo.length + (sep?.[0].length ?? 0);
    }
  }
  const m = inicio.match(/^[^\n]{0,60}?(?:\.-|\.–|[.:])\s*/);
  return m ? m[0].length : 0;
}

let siguienteId = 1;

type Corrida = TextRun | InsertedTextRun | DeletedTextRun;
interface Renglon {
  corridas: Corrida[];
  // true si el siguiente renglón pertenece al mismo bloque (salto de línea simple, como en firmas)
  continua: boolean;
}

// Convierte las piezas en renglones. Un salto doble separa párrafos; un salto simple
// (bloques de firmas, incisos) se vuelve un párrafo pegado al anterior, alineado a la izquierda.
function renglones(piezas: Pieza[]): Renglon[] {
  const salida: Renglon[] = [{ corridas: [], continua: false }];
  const actual = () => salida[salida.length - 1];
  const agregarTexto = (texto: string, negrita?: boolean) => {
    texto.split(/\n\n+/).forEach((bloque, i) => {
      if (i > 0) salida.push({ corridas: [], continua: false });
      bloque.split("\n").forEach((linea, j) => {
        if (j > 0) {
          actual().continua = true;
          salida.push({ corridas: [], continua: false });
        }
        if (linea) actual().corridas.push(new TextRun({ text: linea, bold: negrita, font: FUENTE, size: TAMANO }));
      });
    });
  };
  for (const p of piezas) {
    if (p.tipo === "igual") {
      agregarTexto(p.texto, p.negrita);
      continue;
    }
    for (const t of diferencias(p.original, p.nuevo)) {
      const texto = t.texto.replace(/\s*\n+\s*/g, " ");
      if (!texto) continue;
      if (t.tipo === "igual") actual().corridas.push(new TextRun({ text: texto, font: FUENTE, size: TAMANO }));
      else if (t.tipo === "eliminado")
        actual().corridas.push(new DeletedTextRun({ text: texto, id: siguienteId++, author: p.autor, date: p.fecha, font: FUENTE, size: TAMANO }));
      else actual().corridas.push(new InsertedTextRun({ text: texto, id: siguienteId++, author: p.autor, date: p.fecha, font: FUENTE, size: TAMANO }));
    }
  }
  return salida.filter((r) => r.corridas.length > 0);
}

export async function generarContrapropuesta(p: {
  secciones: SeccionDoc[];
  cambios: Cambio[];
  clausulasNuevas: ClausulaNueva[];
  organizacion: string;
  fecha: string;
}): Promise<Buffer> {
  siguienteId = 1;
  const parrafos: Paragraph[] = [];
  const clausulas = p.secciones.filter((s) => s.tipo === "clausula");
  const ultimaClausula = clausulas.at(-1);
  let numero = ultimaClausula ? ordinalANumero(ultimaClausula.etiqueta) ?? clausulas.length : 0;

  const insertarNuevas = () => {
    for (const n of p.clausulasNuevas) {
      numero++;
      const etiqueta = /^CLÁUSULA \d+/.test(ultimaClausula?.etiqueta ?? "") ? `CLÁUSULA ${numero}.-` : `${numeroAOrdinal(numero)}.-`;
      parrafos.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 300 },
          children: [new InsertedTextRun({ text: `${etiqueta} ${n.texto}`, id: siguienteId++, author: n.autor, date: n.fecha, font: FUENTE, size: TAMANO })],
        }),
      );
    }
  };

  let nuevasInsertadas = false;
  for (const s of p.secciones) {
    // Las cláusulas nuevas van después de la última cláusula y antes del cierre.
    if (!nuevasInsertadas && ultimaClausula && s.inicio > ultimaClausula.inicio) {
      insertarNuevas();
      nuevasInsertadas = true;
    }
    const piezas = piezasDeSeccion(s, p.cambios);
    const negritas = largoEncabezado(s);
    if (negritas && piezas[0]?.tipo === "igual" && piezas[0].texto.length >= negritas) {
      const primera = piezas[0];
      piezas.splice(0, 1, { tipo: "igual", texto: primera.texto.slice(0, negritas), negrita: true }, { tipo: "igual", texto: primera.texto.slice(negritas) });
    }
    if (s.tipo === "encabezado") {
      parrafos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
          children: [new TextRun({ text: s.texto.trim(), bold: true, font: FUENTE, size: TAMANO })],
        }),
      );
      continue;
    }
    const lista = renglones(piezas);
    lista.forEach((r, i) => {
      const enBloque = r.continua || lista[i - 1]?.continua;
      parrafos.push(
        new Paragraph({
          alignment: enBloque ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
          spacing: { after: r.continua ? 0 : 200, line: 300 },
          children: r.corridas,
        }),
      );
    });
  }
  if (!nuevasInsertadas) insertarNuevas();

  const doc = new Document({
    creator: p.organizacion,
    title: "Contrapropuesta",
    features: { trackRevisions: true },
    styles: { default: { document: { run: { font: FUENTE, size: TAMANO } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1440, bottom: 1440, left: 1700, right: 1700 } } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `Contrapropuesta de ${p.organizacion} · ${p.fecha}`, font: FUENTE, size: 18, color: "6E6864" })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], font: FUENTE, size: 18, color: "6E6864" })],
              }),
            ],
          }),
        },
        children: parrafos,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
