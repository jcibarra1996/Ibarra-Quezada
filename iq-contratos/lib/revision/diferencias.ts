import { diffWords } from "diff";

export interface Tramo {
  texto: string;
  tipo: "igual" | "eliminado" | "agregado";
}

export const UMBRAL_IGUALES = 0.5;

// Diferencias palabra por palabra entre el texto original y el propuesto. Es la misma
// base que usa la contrapropuesta en Word para el control de cambios.
export function diferencias(original: string, propuesto: string): Tramo[] {
  if (!original) return propuesto ? [{ texto: propuesto, tipo: "agregado" }] : [];
  if (!propuesto) return [{ texto: original, tipo: "eliminado" }];
  const cambios = diffWords(original, propuesto);
  // Si casi todo cambia, un tachado palabra por palabra es ilegible: se muestra la
  // sustitución completa (texto anterior tachado y texto nuevo).
  const palabras = (s: string) => s.split(/\s+/).filter(Boolean).length;
  const iguales = cambios.filter((c) => !c.added && !c.removed).reduce((n, c) => n + palabras(c.value), 0);
  if (iguales / Math.max(palabras(original), 1) < UMBRAL_IGUALES) {
    return [
      { texto: original, tipo: "eliminado" },
      { texto: " ", tipo: "igual" },
      { texto: propuesto, tipo: "agregado" },
    ];
  }
  return cambios.map((c) => ({
    texto: c.value,
    tipo: c.added ? "agregado" : c.removed ? "eliminado" : "igual",
  }));
}
