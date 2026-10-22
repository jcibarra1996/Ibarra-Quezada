// Cantidades y fechas como se escriben en un contrato mexicano:
// "$180,000.00 (ciento ochenta mil pesos 00/100 M.N.)", "12 (doce) meses", "1 de febrero de 2027".

const UNIDADES = [
  "", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function menorQueMil(n: number): string {
  if (n === 100) return "cien";
  const partes = [CENTENAS[Math.floor(n / 100)]];
  const r = n % 100;
  if (r < 30) partes.push(UNIDADES[r]);
  else partes.push(r % 10 ? `${DECENAS[Math.floor(r / 10)]} y ${UNIDADES[r % 10]}` : DECENAS[Math.floor(r / 10)]);
  return partes.filter(Boolean).join(" ");
}

// "uno" pierde la última vocal antes de un sustantivo: "un peso", "veintiún mil", "treinta y un meses".
const apocopar = (s: string) => s.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");

export function numeroALetras(n: number, antesDeSustantivo = false): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1e12) throw new Error("Cantidad fuera de rango.");
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1e6);
  const miles = Math.floor((n % 1e6) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "un millón" : `${apocopar(numeroALetras(millones))} millones`);
  if (miles) partes.push(miles === 1 ? "mil" : `${apocopar(menorQueMil(miles))} mil`);
  if (resto) partes.push(antesDeSustantivo ? apocopar(menorQueMil(resto)) : menorQueMil(resto));
  return partes.join(" ");
}

export function importeConLetra(monto: number): string {
  if (!Number.isFinite(monto) || monto < 0) throw new Error("Importe no válido.");
  const centavosTotales = Math.round(monto * 100);
  const pesos = Math.floor(centavosTotales / 100);
  const centavos = String(centavosTotales % 100).padStart(2, "0");
  const letras = numeroALetras(pesos, true);
  const de = pesos >= 1e6 && pesos % 1e6 === 0 ? "de " : "";
  const unidad = pesos === 1 ? "peso" : "pesos";
  return `$${pesos.toLocaleString("en-US")}.${centavos} (${letras} ${de}${unidad} ${centavos}/100 M.N.)`;
}

export function cantidadConLetra(n: number, singular: string, plural: string): string {
  return `${n} (${numeroALetras(n, true)}) ${n === 1 ? singular : plural}`;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function fechaLarga(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

// Interpreta "180000", "180,000.50" o "$180,000" como número.
export function leerImporte(s: string): number | null {
  const limpio = s.replace(/[$\s,]/g, "").replace(/M\.?N\.?$/i, "");
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  return Number(limpio);
}
