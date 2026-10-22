// Lectura dirigida de instrumentos notariales: en lugar de mandar al modelo toda un acta
// de 40 páginas, se eligen las páginas donde normalmente están los datos que necesita el
// expediente. Función pura; se prueba sin llamar a la API.
//
// Dónde suelen estar los datos en un instrumento notarial mexicano:
//  - Primera hoja (proemio): número de escritura, volumen o libro, fecha, notario y notaría.
//  - Estatutos: denominación, nacionalidad, domicilio y objeto social en los primeros artículos.
//  - Cláusulas transitorias o resoluciones, al final: administrador o consejo, representantes
//    y otorgamiento de poderes con sus facultades.
//  - Últimas hojas: notas, certificaciones y la boleta de inscripción en el Registro Público
//    de Comercio con el folio mercantil electrónico.
//  - En un poder: proemio, comparecencia, personalidad (que suele repetir los datos del acta),
//    la cláusula de otorgamiento con el nombre del apoderado, facultades y limitaciones.

import type { TipoDocumento } from "./campos";

const CLAVES: Partial<Record<TipoDocumento, RegExp[]>> = {
  acta_constitutiva: [
    /ESCRITURA|INSTRUMENTO|VOLUMEN|LIBRO/,
    /DENOMINACI[OÓ]N/,
    /OBJETO/,
    /NACIONALIDAD|EXTRANJER/,
    /TRANSITORI|RESOLUCIONES|DESIGNA|NOMBRAMIENTO/,
    /ADMINISTRADOR|CONSEJO DE ADMINISTRACI/,
    /PODER|APODERAD|FACULTAD/,
    /FOLIO MERCANTIL|REGISTRO P[UÚ]BLICO DE COMERCIO|INSCRI/,
    /REGISTRO FEDERAL DE CONTRIBUYENTES|R\.?\s?F\.?\s?C\.?/,
  ],
  reforma_estatutos: [
    /ESCRITURA|INSTRUMENTO/,
    /ASAMBLEA|PROTOCOLIZA/,
    /REFORMA|MODIFICA/,
    /DENOMINACI[OÓ]N|OBJETO/,
    /FOLIO MERCANTIL|REGISTRO P[UÚ]BLICO DE COMERCIO|INSCRI/,
  ],
  poder: [
    /ESCRITURA|INSTRUMENTO/,
    /COMPARECE|COMPARECENCIA|PERSONALIDAD/,
    /OTORGA|OTORGAMIENTO|APODERAD/,
    /PLEITOS Y COBRANZAS|ACTOS DE ADMINISTRACI|ACTOS DE DOMINIO|T[IÍ]TULOS DE CR[EÉ]DITO/,
    /LIMITACI|MANCOMUNAD|CONJUNTA|REVOCA|SUSTITU/,
    /FOLIO MERCANTIL|REGISTRO P[UÚ]BLICO DE COMERCIO/,
  ],
};

export const MAXIMO_PAGINAS = 12;
const PAGINAS_EXTREMO = 3;

// Instrumentos que vale la pena recortar; los demás (constancia, identificación,
// comprobante) son cortos y se mandan completos.
export function seRecorta(tipo: TipoDocumento): boolean {
  return tipo in CLAVES;
}

// Elige qué páginas leer (numeradas desde 1, en orden). Siempre las primeras y las últimas;
// después, las que más coinciden con lo que busca el tipo de documento.
export function seleccionarPaginas(textos: string[], tipo: TipoDocumento, maximo = MAXIMO_PAGINAS): number[] {
  const total = textos.length;
  if (total <= maximo || !seRecorta(tipo)) return textos.map((_, i) => i + 1);
  const elegidas = new Set<number>();
  for (let i = 1; i <= Math.min(PAGINAS_EXTREMO, total); i++) elegidas.add(i);
  for (let i = Math.max(1, total - PAGINAS_EXTREMO + 1); i <= total; i++) elegidas.add(i);
  const claves = CLAVES[tipo] ?? [];
  const puntaje = textos
    .map((t, i) => {
      const mayus = t.toUpperCase();
      return { pagina: i + 1, puntos: claves.filter((c) => c.test(mayus)).length };
    })
    .filter((x) => x.puntos > 0 && !elegidas.has(x.pagina))
    .sort((a, b) => b.puntos - a.puntos || a.pagina - b.pagina);
  for (const x of puntaje) {
    if (elegidas.size >= maximo) break;
    elegidas.add(x.pagina);
  }
  return [...elegidas].sort((a, b) => a - b);
}

// Para un PDF escaneado no hay texto que puntuar: primeras y últimas páginas.
export function paginasSinTexto(total: number, maximo = 8): number[] {
  if (total <= maximo) return Array.from({ length: total }, (_, i) => i + 1);
  const mitad = Math.floor(maximo / 2);
  return [...Array.from({ length: mitad }, (_, i) => i + 1), ...Array.from({ length: maximo - mitad }, (_, i) => total - (maximo - mitad) + i + 1)];
}

export function tieneTexto(textos: string[]): boolean {
  const caracteres = textos.reduce((n, t) => n + t.replace(/\s/g, "").length, 0);
  return caracteres / Math.max(1, textos.length) >= 300;
}
