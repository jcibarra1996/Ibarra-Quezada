// Parser de estructura para contratos mexicanos: proemio, antecedentes,
// declaraciones (I, II, III...), cláusulas (PRIMERA, SEGUNDA... o CLÁUSULA 1)
// y cierre de firmas. Trabaja sobre texto ya extraído, página por página.

import { colapsarVacias, esNumeroDePagina, normalizarLineas, unirGuiones } from "./texto";

export type TipoSeccion = "proemio" | "encabezado" | "antecedente" | "declaracion" | "clausula" | "cierre" | "anexo";

export interface Seccion {
  orden: number;
  tipo: TipoSeccion;
  etiqueta: string;
  titulo: string | null;
  texto: string;
  inicio: number;
  fin: number;
  pagina: number;
}

export interface DocumentoEstructurado {
  texto: string;
  paginas: number;
  paginasVirtuales: boolean;
  secciones: Seccion[];
}

export interface OpcionesEstructura {
  // Une en un solo párrafo las líneas cortadas por el ancho de página (PDF).
  reflujo?: boolean;
  // Si el formato no tiene páginas reales (Word), se generan páginas de este tamaño.
  caracteresPorPaginaVirtual?: number;
}

// ---------------------------------------------------------------------------
// Ordinales
// ---------------------------------------------------------------------------

const UNIDADES = ["PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SEPTIMA", "OCTAVA", "NOVENA"];
const DECENAS: Record<string, number> = { DECIMA: 10, DECIMO: 10, VIGESIMA: 20, VIGESIMO: 20, TRIGESIMA: 30, TRIGESIMO: 30, CUADRAGESIMA: 40 };
const ESPECIALES: Record<string, number> = { UNDECIMA: 11, DUODECIMA: 12 };
const ACENTUADO: Record<string, string> = {
  SEPTIMA: "SÉPTIMA", DECIMA: "DÉCIMA", DECIMO: "DÉCIMA", VIGESIMA: "VIGÉSIMA", VIGESIMO: "VIGÉSIMA",
  TRIGESIMA: "TRIGÉSIMA", TRIGESIMO: "TRIGÉSIMA", CUADRAGESIMA: "CUADRAGÉSIMA", UNDECIMA: "UNDÉCIMA", DUODECIMA: "DUODÉCIMA",
};

const U = "PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA";
const D = "D[ÉE]CIM[AO]|VIG[ÉE]SIM[AO]|TRIG[ÉE]SIM[AO]|CUADRAG[ÉE]SIMA";
const E = "UND[ÉE]CIMA|DUOD[ÉE]CIMA";
const ORDINAL = `(?:(?:${D})(?:[\\s-]*(?:${U}))?|${E}|${U})`;
const LETRA = "A-ZÁÉÍÓÚÑÜa-záéíóúñü";

// "PRIMERA.- OBJETO.- ...", "CLÁUSULA SEGUNDA. Vigencia", "DÉCIMA PRIMERA: ...", "VIGÉSIMA"
const RE_CLAUSULA_ORDINAL = new RegExp(
  `^\\s*(CL[ÁA]USULA\\s+)?(${ORDINAL})(?![${LETRA}])\\s*((?:\\.-|\\.–|[.:,)\\-–—])\\s*|$)(.*)$`,
);
// "CLÁUSULA 1.", "CLÁUSULA 12.- ..."
const RE_CLAUSULA_NUMERO = /^\s*CL[ÁA]USULA\s+(\d{1,2})(?!\d)\s*(?:\.-|[.:\-–—])?\s*(.*)$/;
// "I.", "II.-", "IV)" al inicio de línea (declaraciones y antecedentes).
const RE_ROMANO = /^\s*(X{0,3}(?:IX|IV|V?I{1,3}|V))\s*(?:\.-|\.–|[.)\-–])\s+(.*)$/;
const RE_CIERRE = /^\s*(?:le[íi]d[oa]s?\s|enteradas\s|una vez le[íi]d|las partes\s+(?:firman|leen|manifiestan|enteradas)|firman\s+(?:el|las|de)\s|en testimonio de lo cual)/i;
const RE_ANEXO = /^\s*ANEXO\b/;

export function sinAcentos(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function canonizarOrdinal(crudo: string): string {
  const base = sinAcentos(crudo.toUpperCase()).replace(/-/g, " ").replace(/\s+/g, " ").trim();
  // Separar formas pegadas como "DECIMOPRIMERA".
  const separado = base.replace(new RegExp(`^(${Object.keys(DECENAS).join("|")})(?=${UNIDADES.join("|")})`), "$1 ");
  return separado
    .split(" ")
    .map((t) => ACENTUADO[t] ?? t)
    .join(" ");
}

export function ordinalANumero(etiqueta: string): number | null {
  const tokens = sinAcentos(etiqueta.toUpperCase()).replace(/^CLAUSULA\s+/, "").replace(/-/g, " ").split(/\s+/).filter(Boolean);
  if (tokens.length === 1 && /^\d+$/.test(tokens[0])) return Number(tokens[0]);
  let total = 0;
  for (const t of tokens) {
    if (t in ESPECIALES) total += ESPECIALES[t];
    else if (t in DECENAS) total += DECENAS[t];
    else if (UNIDADES.includes(t)) total += UNIDADES.indexOf(t) + 1;
    else return null;
  }
  return total || null;
}

const UNIDADES_ACENTO = ["PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA", "OCTAVA", "NOVENA"];
const DECENAS_ACENTO = ["", "DÉCIMA", "VIGÉSIMA", "TRIGÉSIMA", "CUADRAGÉSIMA"];

// 16 -> "DÉCIMA SEXTA". Se usa para numerar cláusulas nuevas en la contrapropuesta.
export function numeroAOrdinal(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 49) return `CLÁUSULA ${n}`;
  const d = Math.floor(n / 10);
  const u = n % 10;
  return [DECENAS_ACENTO[d], u ? UNIDADES_ACENTO[u - 1] : ""].filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Encabezados de bloque
// ---------------------------------------------------------------------------

type Zona = "proemio" | "antecedentes" | "declaraciones" | "clausulas" | "cierre" | "anexo";

// Un encabezado ("DECLARACIONES", "C L Á U S U L A S") va en su propio renglón. Si el renglón
// anterior no cierra con puntuación, es la continuación de una oración del proemio
// ("...AL TENOR DE LAS SIGUIENTES DECLARACIONES Y / CLÁUSULAS:").
function encabezadoDeBloque(linea: string, previa?: string): Zona | null {
  if (previa !== undefined && previa.trim() !== "" && !/[.:;)"”]$/.test(previa.trim())) return null;
  const t = linea.trim();
  if (!t || t.length > 40) return null;
  const compacto = sinAcentos(t).toUpperCase().replace(/[^A-Z]/g, "");
  if (compacto === "ANTECEDENTES") return "antecedentes";
  if (compacto === "DECLARACIONES") return "declaraciones";
  if (compacto === "CLAUSULAS") return "clausulas";
  return null;
}

// Título en mayúsculas al inicio del cuerpo de una cláusula: "OBJETO.- El Proveedor..."
function separarTitulo(resto: string): { titulo: string | null; cuerpo: string } {
  const r = resto.trim();
  const mayus = r.match(/^([A-ZÁÉÍÓÚÑÜ"“][A-ZÁÉÍÓÚÑÜ0-9 ,;()/"“”'-]{1,118}?)\s*(\.-|\.–|\.|:)(?:\s+|$)(.*)$/s);
  if (mayus && !/[a-záéíóúñü]/.test(mayus[1]) && mayus[1].replace(/[^A-ZÁÉÍÓÚÑÜ]/g, "").length >= 3) {
    return { titulo: mayus[1].replace(/["“”]/g, "").trim(), cuerpo: mayus[3] };
  }
  const tipoTitulo = r.match(/^([A-ZÁÉÍÓÚÑ][a-záéíóúñü]+(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñü]+){0,6})\s*\.-\s*(.*)$/s);
  if (tipoTitulo) return { titulo: tipoTitulo[1].trim(), cuerpo: tipoTitulo[2] };
  return { titulo: null, cuerpo: r };
}

// ---------------------------------------------------------------------------
// Reflujo de párrafos (PDF)
// ---------------------------------------------------------------------------

function iniciaEstructura(linea: string, previa: string): boolean {
  return (
    RE_CLAUSULA_ORDINAL.test(linea) ||
    RE_CLAUSULA_NUMERO.test(linea) ||
    RE_ROMANO.test(linea) ||
    encabezadoDeBloque(linea, previa) !== null ||
    RE_ANEXO.test(linea) ||
    /^\s*(?:[a-z]|\d{1,2}|[ivx]{1,4})\s*[.)]\s+/i.test(linea) ||
    /^\s*[-•·]\s+/.test(linea)
  );
}

function reflujo(lineas: string[]): string[] {
  const salida: string[] = [];
  for (const l of lineas) {
    const previa = salida[salida.length - 1];
    if (previa !== undefined && previa.trim() !== "" && l.trim() !== "" && !iniciaEstructura(l, previa) && !/[:;]$/.test(previa.trim())) {
      salida[salida.length - 1] = `${previa} ${l.trim()}`;
    } else {
      salida.push(l.trim() === "" ? "" : l.trim());
    }
  }
  return salida;
}

// ---------------------------------------------------------------------------
// Estructura
// ---------------------------------------------------------------------------

interface Linea {
  texto: string;
  inicio: number;
}

interface SeccionAbierta {
  tipo: TipoSeccion;
  etiqueta: string;
  titulo: string | null;
  lineas: Linea[];
}

export function estructurar(paginasCrudas: string[], opciones: OpcionesEstructura = {}): DocumentoEstructurado {
  // 1. Normalizar cada página y unirlas; registrar dónde empieza cada página.
  const paginasLimpias = paginasCrudas.map((p) => {
    let lineas = normalizarLineas(p).filter((l) => !esNumeroDePagina(l));
    lineas = unirGuiones(lineas);
    if (opciones.reflujo) lineas = reflujo(lineas);
    return colapsarVacias(lineas).join("\n");
  });

  let texto = "";
  const iniciosPagina: number[] = [];
  for (const p of paginasLimpias) {
    if (!p.trim()) continue;
    if (texto) texto += "\n\n";
    iniciosPagina.push(texto.length);
    texto += p;
  }

  let paginasVirtuales = false;
  if (opciones.caracteresPorPaginaVirtual && iniciosPagina.length <= 1) {
    paginasVirtuales = true;
    iniciosPagina.length = 0;
    iniciosPagina.push(0);
    const tam = opciones.caracteresPorPaginaVirtual;
    let corte = 0;
    while (corte + tam < texto.length) {
      // Cortar en el siguiente salto de párrafo después del tamaño objetivo.
      const siguiente = texto.indexOf("\n\n", corte + tam);
      if (siguiente === -1) break;
      corte = siguiente + 2;
      iniciosPagina.push(corte);
    }
  }
  if (iniciosPagina.length === 0) iniciosPagina.push(0);

  const paginaDe = (offset: number) => {
    let p = 1;
    for (let i = 0; i < iniciosPagina.length; i++) if (iniciosPagina[i] <= offset) p = i + 1;
    return p;
  };

  // 2. Recorrer líneas con su posición absoluta.
  const lineas: Linea[] = [];
  let pos = 0;
  for (const l of texto.split("\n")) {
    lineas.push({ texto: l, inicio: pos });
    pos += l.length + 1;
  }

  const abiertas: SeccionAbierta[] = [];
  let zona: Zona = "proemio";
  let actual: SeccionAbierta = { tipo: "proemio", etiqueta: "PROEMIO", titulo: null, lineas: [] };
  const abrir = (s: SeccionAbierta) => {
    abiertas.push(actual);
    actual = s;
  };

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const t = linea.texto;
    const bloque = encabezadoDeBloque(t, i > 0 ? lineas[i - 1].texto : undefined);
    if (bloque) {
      zona = bloque;
      const etiqueta = bloque === "antecedentes" ? "ANTECEDENTES" : bloque === "declaraciones" ? "DECLARACIONES" : "CLÁUSULAS";
      abrir({ tipo: "encabezado", etiqueta, titulo: null, lineas: [linea] });
      abrir({
        tipo: bloque === "antecedentes" ? "antecedente" : bloque === "declaraciones" ? "declaracion" : "clausula",
        etiqueta,
        titulo: null,
        lineas: [],
      });
      continue;
    }

    if (zona !== "anexo" && zona !== "cierre") {
      const ord = t.match(RE_CLAUSULA_ORDINAL);
      const num = ord ? null : t.match(RE_CLAUSULA_NUMERO);
      // Un ordinal suelto solo cuenta como cláusula si trae separador, título o el prefijo CLÁUSULA,
      // y nunca dentro del proemio (ahí "PRIMERA" sería parte de una oración).
      if (ord && (zona !== "proemio" || ord[1])) {
        const etiqueta = canonizarOrdinal(ord[2]);
        const { titulo } = separarTitulo(ord[4] ?? "");
        zona = "clausulas";
        abrir({ tipo: "clausula", etiqueta, titulo, lineas: [linea] });
        continue;
      }
      if (num) {
        const { titulo } = separarTitulo(num[2] ?? "");
        zona = "clausulas";
        abrir({ tipo: "clausula", etiqueta: `CLÁUSULA ${Number(num[1])}`, titulo, lineas: [linea] });
        continue;
      }
    }

    if (zona === "declaraciones" || zona === "antecedentes") {
      const rom = t.match(RE_ROMANO);
      if (rom) {
        const tipo: TipoSeccion = zona === "declaraciones" ? "declaracion" : "antecedente";
        const prefijo = zona === "declaraciones" ? "DECLARACIÓN" : "ANTECEDENTE";
        const { titulo } = separarTitulo(rom[2]);
        abrir({ tipo, etiqueta: `${prefijo} ${rom[1]}`, titulo, lineas: [linea] });
        continue;
      }
    }

    if (zona === "clausulas" && RE_CIERRE.test(t)) {
      zona = "cierre";
      abrir({ tipo: "cierre", etiqueta: "CIERRE", titulo: null, lineas: [linea] });
      continue;
    }

    if (RE_ANEXO.test(t) && t.trim().length < 80) {
      zona = "anexo";
      abrir({ tipo: "anexo", etiqueta: t.trim().replace(/[.:\-–]+$/, ""), titulo: null, lineas: [linea] });
      continue;
    }

    actual.lineas.push(linea);
  }
  abiertas.push(actual);

  // 3. Cerrar secciones: recortar líneas vacías y calcular posiciones exactas.
  const secciones: Seccion[] = [];
  for (const s of abiertas) {
    const conTexto = s.lineas.filter((l) => l.texto.trim() !== "");
    if (conTexto.length === 0) continue;
    const primera = conTexto[0];
    const ultima = conTexto[conTexto.length - 1];
    const inicio = primera.inicio + (primera.texto.length - primera.texto.trimStart().length);
    const fin = ultima.inicio + ultima.texto.trimEnd().length;
    secciones.push({
      orden: secciones.length,
      tipo: s.tipo,
      etiqueta: s.etiqueta,
      titulo: s.titulo,
      texto: texto.slice(inicio, fin),
      inicio,
      fin,
      pagina: paginaDe(inicio),
    });
  }

  return { texto, paginas: iniciosPagina.length, paginasVirtuales, secciones };
}

export function resumenEstructura(doc: DocumentoEstructurado) {
  return {
    declaraciones: doc.secciones.filter((s) => s.tipo === "declaracion").length,
    clausulas: doc.secciones.filter((s) => s.tipo === "clausula").length,
    paginas: doc.paginas,
  };
}
