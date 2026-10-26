import mammoth from "mammoth";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

// Convierte el Word del contrato en el PDF que se manda a firma. Conserva el texto completo,
// las negritas y cursivas, las listas y las tablas (por ejemplo, los bloques de firmas);
// el formato fino del Word (tipografía, márgenes, encabezados) no se conserva.

export interface Fragmento {
  texto: string;
  negrita?: boolean;
  cursiva?: boolean;
}

export type Bloque =
  | { tipo: "parrafo"; fragmentos: Fragmento[]; titulo?: boolean; centrado?: boolean }
  | { tipo: "tabla"; filas: Fragmento[][][][] };

const ENTIDADES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
const decodificar = (s: string) =>
  s.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (e) => ENTIDADES[e]).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

// Lee el HTML que produce mammoth (etiquetas p, h1-h6, strong, em, listas y tablas).
export function bloquesDesdeHtml(html: string): Bloque[] {
  const bloques: Bloque[] = [];
  let negrita = 0;
  let cursiva = 0;
  let parrafo: Fragmento[] | null = null;
  let titulo = false;
  const listas: { ordenada: boolean; n: number }[] = [];
  // Pila de tablas: filas > celdas > párrafos de la celda > fragmentos.
  const tablas: { filas: Fragmento[][][][] }[] = [];

  const cerrarParrafo = () => {
    if (!parrafo) return;
    const texto = parrafo.map((f) => f.texto).join("");
    const tabla = tablas[tablas.length - 1];
    if (tabla) {
      const fila = tabla.filas[tabla.filas.length - 1];
      fila?.[fila.length - 1]?.push(parrafo);
    } else if (texto.trim()) {
      bloques.push({ tipo: "parrafo", fragmentos: parrafo, titulo });
    }
    parrafo = null;
    titulo = false;
  };
  const abrirParrafo = (prefijo = "") => {
    cerrarParrafo();
    parrafo = prefijo ? [{ texto: prefijo }] : [];
  };
  const agregar = (texto: string) => {
    if (!texto) return;
    if (!parrafo) parrafo = [];
    parrafo.push({ texto, negrita: negrita > 0 || titulo, cursiva: cursiva > 0 });
  };

  for (const m of html.matchAll(/<(\/?)([a-z0-9]+)[^>]*?(\/?)>|([^<]+)/gi)) {
    if (m[4] !== undefined) {
      agregar(decodificar(m[4]));
      continue;
    }
    const cierre = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (tag === "br") agregar("\n");
    else if (tag === "strong" || tag === "b") negrita += cierre ? -1 : 1;
    else if (tag === "em" || tag === "i") cursiva += cierre ? -1 : 1;
    else if (tag === "p" || /^h[1-6]$/.test(tag)) {
      if (cierre) cerrarParrafo();
      else {
        abrirParrafo();
        titulo = tag !== "p";
      }
    } else if (tag === "ul" || tag === "ol") {
      if (cierre) listas.pop();
      else listas.push({ ordenada: tag === "ol", n: 0 });
    } else if (tag === "li") {
      if (cierre) cerrarParrafo();
      else {
        const lista = listas[listas.length - 1];
        if (lista) lista.n += 1;
        abrirParrafo(`${"   ".repeat(Math.max(0, listas.length - 1))}${lista?.ordenada ? `${lista.n}.` : "•"} `);
      }
    } else if (tag === "table") {
      cerrarParrafo();
      if (cierre) {
        const t = tablas.pop();
        if (!t) continue;
        const fuera = tablas[tablas.length - 1];
        if (fuera) {
          // Tabla dentro de tabla: sus celdas se aplanan en la celda que la contiene.
          const fila = fuera.filas[fuera.filas.length - 1];
          const celda = fila?.[fila.length - 1];
          for (const f of t.filas) for (const c of f) celda?.push(...c);
        } else if (t.filas.some((f) => f.some((c) => c.length))) bloques.push({ tipo: "tabla", filas: t.filas });
      } else tablas.push({ filas: [] });
    } else if (tag === "tr" && !cierre) tablas[tablas.length - 1]?.filas.push([]);
    else if ((tag === "td" || tag === "th") && !cierre) {
      cerrarParrafo();
      const t = tablas[tablas.length - 1];
      t?.filas[t.filas.length - 1]?.push([]);
    } else if ((tag === "td" || tag === "th") && cierre) cerrarParrafo();
  }
  cerrarParrafo();

  // El primer párrafo suele ser el título del contrato, y los encabezados de sección
  // ("DECLARACIONES", "CLÁUSULAS") van en mayúsculas y cortos: se centran en negritas.
  bloques.forEach((b, i) => {
    if (b.tipo !== "parrafo") return;
    const texto = b.fragmentos.map((f) => f.texto).join("").trim();
    const esEncabezado = texto.length <= 60 && texto === texto.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(texto) && !/[.:,;]\s*\S/.test(texto);
    if (b.titulo || esEncabezado || (i === 0 && texto.length <= 200)) {
      b.centrado = true;
      b.fragmentos = b.fragmentos.map((f) => ({ ...f, negrita: true }));
    }
  });
  return bloques;
}

// --- Composición del PDF ---

const CARTA: [number, number] = [612, 792];
const MARGEN = 72;
const TAMANO = 11;
const INTERLINEA = 15.5;
const ESPACIO_PARRAFO = 7;

interface Fuentes {
  normal: PDFFont;
  negrita: PDFFont;
  cursiva: PDFFont;
  negritaCursiva: PDFFont;
}

// Ancho tal como se dibuja: drawText no aplica interletraje (kerning) y widthOfTextAtSize
// sí, así que se suma letra por letra para que las palabras no se encimen.
const anchos = new Map<PDFFont, Map<string, number>>();
function anchoDe(fuente: PDFFont, texto: string, tamano = TAMANO) {
  let porLetra = anchos.get(fuente);
  if (!porLetra) anchos.set(fuente, (porLetra = new Map()));
  let total = 0;
  for (const ch of texto) {
    let w = porLetra.get(ch);
    if (w === undefined) porLetra.set(ch, (w = fuente.widthOfTextAtSize(ch, 1)));
    total += w;
  }
  return total * tamano;
}

const fuenteDe = (f: Fuentes, frag: Fragmento) =>
  frag.negrita && frag.cursiva ? f.negritaCursiva : frag.negrita ? f.negrita : frag.cursiva ? f.cursiva : f.normal;

// Las fuentes estándar del PDF usan la codificación WinAnsi (cubre el español). Lo que no
// cabe ahí se sustituye por su equivalente más cercano.
const SUSTITUTOS: Record<string, string> = { " ": " ", "‐": "-", "‑": "-", "‒": "-", "−": "-", " ": " ", " ": " ", " ": " ", "\t": " " };
function codificable(fuente: PDFFont, cache: Map<string, boolean>, ch: string) {
  let ok = cache.get(ch);
  if (ok === undefined) {
    try {
      fuente.encodeText(ch);
      ok = true;
    } catch {
      ok = false;
    }
    cache.set(ch, ok);
  }
  return ok;
}

interface Palabra {
  texto: string;
  fuente: PDFFont;
  ancho: number;
  // Si va pegada a la anterior (sin espacio entre ambas).
  pegada: boolean;
}

function palabras(fragmentos: Fragmento[], f: Fuentes, cache: Map<string, boolean>): Palabra[][] {
  // Devuelve renglones forzados (saltos de línea del Word) con sus palabras.
  const renglones: Palabra[][] = [[]];
  let espacioPendiente = false;
  for (const frag of fragmentos) {
    const fuente = fuenteDe(f, frag);
    const limpio = [...frag.texto.replace(/[​‌‍﻿­]/g, "")]
      .map((ch) => (ch === "\n" ? ch : (SUSTITUTOS[ch] ?? (codificable(fuente, cache, ch) ? ch : "?"))))
      .join("");
    for (const pieza of limpio.split(/(\n|\s+)/)) {
      if (pieza === "\n") {
        renglones.push([]);
        espacioPendiente = false;
      } else if (/^\s+$/.test(pieza)) espacioPendiente = true;
      else if (pieza) {
        const actual = renglones[renglones.length - 1];
        actual.push({ texto: pieza, fuente, ancho: anchoDe(fuente, pieza), pegada: actual.length > 0 && !espacioPendiente });
        espacioPendiente = false;
      }
    }
  }
  return renglones;
}

interface Linea {
  palabras: Palabra[];
  ancho: number;
  ultima: boolean;
}

function partirEnLineas(fragmentos: Fragmento[], ancho: number, f: Fuentes, cache: Map<string, boolean>): Linea[] {
  const espacio = anchoDe(f.normal, " ");
  const lineas: Linea[] = [];
  for (const renglon of palabras(fragmentos, f, cache)) {
    let actual: Palabra[] = [];
    let anchoActual = 0;
    const cerrar = (ultima: boolean) => {
      lineas.push({ palabras: actual, ancho: anchoActual, ultima });
      actual = [];
      anchoActual = 0;
    };
    for (let p of renglon) {
      // Una palabra más ancha que la línea (por ejemplo, una URL) se corta por caracteres.
      while (p.ancho > ancho) {
        let n = p.texto.length - 1;
        while (n > 1 && anchoDe(p.fuente, p.texto.slice(0, n)) > ancho) n--;
        if (actual.length) cerrar(false);
        actual = [{ ...p, texto: p.texto.slice(0, n), ancho: anchoDe(p.fuente, p.texto.slice(0, n)), pegada: false }];
        anchoActual = actual[0].ancho;
        cerrar(false);
        p = { ...p, texto: p.texto.slice(n), ancho: anchoDe(p.fuente, p.texto.slice(n)), pegada: false };
      }
      const extra = (actual.length && !p.pegada ? espacio : 0) + p.ancho;
      if (actual.length && anchoActual + extra > ancho && !p.pegada) cerrar(false);
      anchoActual += (actual.length && !p.pegada ? espacio : 0) + p.ancho;
      actual.push(actual.length ? p : { ...p, pegada: false });
    }
    cerrar(true);
  }
  return lineas;
}

function dibujarLinea(pagina: PDFPage, l: Linea, x: number, y: number, ancho: number, modo: "justificado" | "centrado" | "izquierda", espacio: number) {
  const huecos = l.palabras.filter((p, i) => i > 0 && !p.pegada).length;
  const justificar = modo === "justificado" && !l.ultima && huecos > 0;
  const separacion = justificar ? espacio + (ancho - l.ancho) / huecos : espacio;
  let cx = modo === "centrado" ? x + (ancho - l.ancho) / 2 : x;
  l.palabras.forEach((p, i) => {
    if (i > 0 && !p.pegada) cx += separacion;
    pagina.drawText(p.texto, { x: cx, y, size: TAMANO, font: p.fuente, color: rgb(0.1, 0.08, 0.08) });
    cx += p.ancho;
  });
}

export async function pdfDesdeBloques(bloques: Bloque[], meta: { titulo: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(meta.titulo);
  doc.setCreator("Qlaro");
  doc.setProducer("Qlaro");
  const f: Fuentes = {
    normal: await doc.embedFont(StandardFonts.TimesRoman),
    negrita: await doc.embedFont(StandardFonts.TimesRomanBold),
    cursiva: await doc.embedFont(StandardFonts.TimesRomanItalic),
    negritaCursiva: await doc.embedFont(StandardFonts.TimesRomanBoldItalic),
  };
  const cache = new Map<string, boolean>();
  const espacio = anchoDe(f.normal, " ");
  const anchoTexto = CARTA[0] - 2 * MARGEN;
  let pagina = doc.addPage(CARTA);
  let y = CARTA[1] - MARGEN;
  const nuevaPagina = () => {
    pagina = doc.addPage(CARTA);
    y = CARTA[1] - MARGEN;
  };
  const cabe = (alto: number) => y - alto >= MARGEN;

  for (const b of bloques) {
    if (b.tipo === "parrafo") {
      const lineas = partirEnLineas(b.fragmentos, anchoTexto, f, cache);
      for (const [i, l] of lineas.entries()) {
        // Evita dejar sola la primera línea de un párrafo al pie de la página.
        if (!cabe(INTERLINEA * (i === 0 && lineas.length > 1 ? 2 : 1))) nuevaPagina();
        y -= INTERLINEA;
        dibujarLinea(pagina, l, MARGEN, y + 4, anchoTexto, b.centrado ? "centrado" : "justificado", espacio);
      }
      y -= ESPACIO_PARRAFO + (b.centrado ? 3 : 0);
      continue;
    }
    // Tabla: columnas del mismo ancho, sin bordes (como suelen ir los bloques de firmas).
    for (const fila of b.filas) {
      const columnas = Math.max(1, fila.length);
      const anchoCelda = (anchoTexto - (columnas - 1) * 14) / columnas;
      const celdas = fila.map((c) => c.map((p) => partirEnLineas(p, anchoCelda, f, cache)));
      const alto = Math.max(...celdas.map((c) => c.reduce((s, p) => s + p.length * INTERLINEA + ESPACIO_PARRAFO / 2, 0)), INTERLINEA);
      if (!cabe(Math.min(alto, CARTA[1] - 2 * MARGEN))) nuevaPagina();
      const inicio = y;
      let fondo = y;
      celdas.forEach((parrafos, j) => {
        let cy = inicio;
        const x = MARGEN + j * (anchoCelda + 14);
        for (const lineas of parrafos) {
          for (const l of lineas) {
            if (cy - INTERLINEA < MARGEN) break;
            cy -= INTERLINEA;
            dibujarLinea(pagina, l, x, cy + 4, anchoCelda, columnas > 1 ? "centrado" : "izquierda", espacio);
          }
          cy -= ESPACIO_PARRAFO / 2;
        }
        fondo = Math.min(fondo, cy);
      });
      y = fondo - ESPACIO_PARRAFO;
    }
  }

  const paginas = doc.getPages();
  paginas.forEach((p, i) => {
    const texto = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(texto, { x: (CARTA[0] - anchoDe(f.normal, texto, 9)) / 2, y: MARGEN / 2, size: 9, font: f.normal, color: rgb(0.43, 0.41, 0.39) });
  });
  return doc.save();
}

export class ErrorConversion extends Error {}

export async function pdfDesdeWord(datos: Buffer, titulo: string): Promise<Buffer> {
  const { value: html } = await mammoth.convertToHtml({ buffer: datos });
  const bloques = bloquesDesdeHtml(html);
  if (!bloques.length) throw new ErrorConversion("El Word no tiene texto para convertir a PDF.");
  return Buffer.from(await pdfDesdeBloques(bloques, { titulo }));
}
