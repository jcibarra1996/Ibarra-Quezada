// Divide el texto de una sección en fragmentos para resaltar las citas de los hallazgos.
// Las posiciones de las marcas son absolutas sobre el texto completo del contrato.

export interface Marca {
  id: string;
  numero: number;
  riesgo: "alto" | "medio" | "bajo";
  inicio: number;
  fin: number;
}

export interface Fragmento {
  texto: string;
  marca: Marca | null;
}

export function fragmentar(texto: string, inicioSeccion: number, marcas: Marca[]): Fragmento[] {
  const finSeccion = inicioSeccion + texto.length;
  const dentro = marcas
    .filter((m) => m.fin > inicioSeccion && m.inicio < finSeccion)
    .sort((a, b) => a.inicio - b.inicio || b.fin - a.fin);

  const salida: Fragmento[] = [];
  let cursor = inicioSeccion;
  for (const m of dentro) {
    const ini = Math.max(m.inicio, cursor);
    const fin = Math.min(m.fin, finSeccion);
    if (fin <= ini) continue; // marca contenida en una anterior
    if (ini > cursor) salida.push({ texto: texto.slice(cursor - inicioSeccion, ini - inicioSeccion), marca: null });
    salida.push({ texto: texto.slice(ini - inicioSeccion, fin - inicioSeccion), marca: m });
    cursor = fin;
  }
  if (cursor < finSeccion) salida.push({ texto: texto.slice(cursor - inicioSeccion), marca: null });
  return salida;
}
