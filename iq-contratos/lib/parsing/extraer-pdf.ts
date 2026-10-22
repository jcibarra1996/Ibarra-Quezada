import { getDocumentProxy } from "unpdf";

interface ItemTexto {
  str: string;
  hasEOL?: boolean;
  transform: number[];
  height: number;
}

const esItemTexto = (i: unknown): i is ItemTexto => typeof i === "object" && i !== null && "str" in i;

// Devuelve el texto de cada página con saltos de línea reales y una línea en blanco
// donde el espacio vertical indica cambio de párrafo.
export async function extraerPaginasPdf(datos: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(datos);
  const paginas: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pagina = await pdf.getPage(n);
    const contenido = await pagina.getTextContent();
    const items: ItemTexto[] = (contenido.items as unknown[]).filter(esItemTexto);

    const lineas: { texto: string; y: number; alto: number }[] = [];
    let actual = "";
    let y: number | null = null;
    let alto = 0;
    const cerrar = () => {
      if (y !== null) lineas.push({ texto: actual, y, alto });
      actual = "";
      y = null;
      alto = 0;
    };
    for (const item of items) {
      const yItem = item.transform[5];
      if (y !== null && Math.abs(yItem - y) > Math.max(2, item.height * 0.5) && item.str.trim() !== "") cerrar();
      if (y === null && item.str.trim() !== "") y = yItem;
      actual += item.str;
      alto = Math.max(alto, item.height);
      if (item.hasEOL) cerrar();
    }
    cerrar();

    // Distancia típica entre renglones para detectar separación de párrafos.
    const saltos = lineas.slice(1).map((l, i) => Math.abs(lineas[i].y - l.y)).filter((d) => d > 0);
    const ordenados = [...saltos].sort((a, b) => a - b);
    const mediana = ordenados.length ? ordenados[Math.floor(ordenados.length / 2)] : 0;

    const salida: string[] = [];
    lineas.forEach((l, i) => {
      if (i > 0 && mediana > 0 && Math.abs(lineas[i - 1].y - l.y) > mediana * 1.45) salida.push("");
      salida.push(l.texto);
    });
    paginas.push(salida.join("\n"));
  }
  await pdf.cleanup();
  return paginas;
}
