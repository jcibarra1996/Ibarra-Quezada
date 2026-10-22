// Datos generales que se pueden leer del proemio sin interpretar el contrato.

const RE_SOCIEDAD = /([A-ZÁÉÍÓÚÑÜ0-9][A-ZÁÉÍÓÚÑÜ0-9&.,'\- ]{2,120}?,\s*S\.\s?A\.(?:\s?P\.\s?I\.)?(?:\s?B\.)?\s+DE\s+C\.\s?V\.|[A-ZÁÉÍÓÚÑÜ0-9][A-ZÁÉÍÓÚÑÜ0-9&.,'\- ]{2,120}?,\s*S\.\s?(?:DE\s+)?R\.\s?L\.(?:\s+DE\s+C\.\s?V\.)?|[A-ZÁÉÍÓÚÑÜ0-9][A-ZÁÉÍÓÚÑÜ0-9&.,'\- ]{2,120}?,\s*S\.\s?C\.)/g;

function limpiarNombre(n: string): string {
  return n
    .replace(/^.*?\b(?:CELEBRAN|ENTRE|PARTE|OTRA|Y)\s*,?\s*/i, (m) => (/[a-z]/.test(m) ? m : ""))
    .replace(/^(?:POR UNA PARTE|POR LA OTRA|Y)\s*,?\s*/i, "")
    .replace(/^(?:LA\s+)?(?:SOCIEDAD|EMPRESA|PERSONA MORAL)?\s*DENOMINADA\s+/i, "")
    .trim();
}

export function sociedadesEnProemio(proemio: string): string[] {
  const vistas = new Set<string>();
  for (const m of proemio.toUpperCase().matchAll(RE_SOCIEDAD)) {
    let nombre = m[1].trim();
    // Quitar el texto que precede al nombre dentro de la misma coincidencia.
    nombre = nombre.replace(/^.*\b(?:CELEBRAN|PARTE|OTRA)\s*,?\s*/, "");
    nombre = limpiarNombre(nombre);
    if (nombre.length > 6) vistas.add(nombre.replace(/\s+/g, " "));
  }
  return [...vistas];
}

export function contraparteDelProemio(proemio: string, nombreOrganizacion: string): string | null {
  const propia = nombreOrganizacion.toUpperCase().replace(/\s+/g, " ").trim();
  const otras = sociedadesEnProemio(proemio).filter((s) => s !== propia);
  return otras[0] ?? null;
}

export function tituloDelProemio(proemio: string, nombreArchivo: string): string {
  const m = proemio.match(/^\s*((?:CONTRATO|CONVENIO|ACUERDO)\b.*?)(?:\s+QUE\s+CELEBRAN\b|,|\n|$)/i);
  if (m && m[1].length <= 140) {
    const t = m[1].trim().toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return nombreArchivo.replace(/\.(pdf|docx)$/i, "").replace(/[_-]+/g, " ").trim();
}
