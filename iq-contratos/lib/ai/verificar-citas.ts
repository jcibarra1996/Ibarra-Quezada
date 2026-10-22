// Ubica una cita del modelo dentro del texto del contrato. La comparación tolera solo
// diferencias tipográficas (espacios, saltos de línea, comillas y guiones tipográficos);
// cualquier otra diferencia hace que la cita no se encuentre y el hallazgo se descarte.

const EQUIVALENCIAS: Record<string, string> = {
  "“": '"', "”": '"', "„": '"', "«": '"', "»": '"',
  "‘": "'", "’": "'", "‚": "'",
  "–": "-", "—": "-", "‑": "-", "−": "-",
  " ": " ", " ": " ", " ": " ",
};

interface TextoNormalizado {
  texto: string;
  // posicion[i] = índice en el texto original del carácter i del texto normalizado
  posicion: number[];
}

export function normalizarParaCita(original: string): TextoNormalizado {
  const salida: string[] = [];
  const posicion: number[] = [];
  let espacioPendiente = -1;
  const nfc = original.normalize("NFC");
  for (let i = 0; i < nfc.length; i++) {
    let c = nfc[i];
    c = EQUIVALENCIAS[c] ?? c;
    if (c === "­" || c === "​") continue;
    if (/\s/.test(c)) {
      if (espacioPendiente === -1) espacioPendiente = i;
      continue;
    }
    if (espacioPendiente !== -1) {
      if (salida.length > 0) {
        salida.push(" ");
        posicion.push(espacioPendiente);
      }
      espacioPendiente = -1;
    }
    salida.push(c);
    posicion.push(i);
  }
  return { texto: salida.join(""), posicion };
}

export interface Ubicacion {
  inicio: number;
  fin: number;
}

export function localizarCita(textoContrato: string, cita: string, rango?: Ubicacion): Ubicacion | null {
  const buscada = normalizarParaCita(cita).texto;
  // Citas muy cortas no identifican un lugar del contrato de forma confiable.
  if (buscada.length < 12) return null;

  const doc = normalizarParaCita(textoContrato);
  const encontrar = (desde: number, hasta: number) => {
    const i = doc.texto.indexOf(buscada, desde);
    return i !== -1 && i + buscada.length <= hasta ? i : -1;
  };

  let indice = -1;
  if (rango) {
    // Convertir el rango original a posiciones normalizadas.
    const desde = doc.posicion.findIndex((p) => p >= rango.inicio);
    let hasta = doc.posicion.findIndex((p) => p >= rango.fin);
    if (hasta === -1) hasta = doc.texto.length;
    if (desde !== -1) indice = encontrar(desde, hasta);
  }
  if (indice === -1) indice = doc.texto.indexOf(buscada);
  if (indice === -1) return null;

  const inicio = doc.posicion[indice];
  const fin = doc.posicion[indice + buscada.length - 1] + 1;
  return { inicio, fin };
}
