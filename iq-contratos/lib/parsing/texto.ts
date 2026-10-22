// Limpieza del texto extraído. El resultado es el texto canónico del contrato:
// es el que se guarda, el que lee el modelo y contra el que se verifican las citas.

const PATRON_NUMERO_PAGINA = /^\s*(?:p[áa]g(?:ina)?\.?\s*)?\d{1,4}\s*(?:(?:de|\/)\s*\d{1,4})?\s*$/i;

export function normalizarLineas(texto: string): string[] {
  return texto
    .replace(/\r\n?/g, "\n")
    .replace(/­/g, "")
    .replace(/[   \t]/g, " ")
    .replace(/[​﻿]/g, "")
    .normalize("NFC")
    .split("\n")
    .map((l) => l.replace(/ {2,}/g, " ").trimEnd());
}

export function esNumeroDePagina(linea: string): boolean {
  return PATRON_NUMERO_PAGINA.test(linea);
}

// Une palabras partidas con guion al final de línea ("obliga-\nción").
export function unirGuiones(lineas: string[]): string[] {
  const salida: string[] = [];
  for (let i = 0; i < lineas.length; i++) {
    let actual = lineas[i];
    while (/[a-záéíóúñü]-$/.test(actual) && i + 1 < lineas.length && /^[a-záéíóúñü]/.test(lineas[i + 1].trimStart())) {
      actual = actual.slice(0, -1) + lineas[i + 1].trimStart();
      i++;
    }
    salida.push(actual);
  }
  return salida;
}

export function colapsarVacias(lineas: string[]): string[] {
  const salida: string[] = [];
  for (const l of lineas) {
    const vacia = l.trim() === "";
    if (vacia && (salida.length === 0 || salida[salida.length - 1].trim() === "")) continue;
    salida.push(vacia ? "" : l);
  }
  while (salida.length && salida[salida.length - 1] === "") salida.pop();
  return salida;
}
