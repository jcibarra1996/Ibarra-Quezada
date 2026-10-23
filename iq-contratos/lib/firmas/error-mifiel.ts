// Lee la razón de un error de Mifiel. La especificación documenta {errors: [{title,
// details}]}, pero la API también responde con listas de textos, {error}, {message} o
// errores por campo ({errors: {campo: [mensajes]}}); cualquiera de ellos se muestra.
export function detalleErrorMifiel(cuerpo: unknown): string | null {
  const textos: string[] = [];
  const leer = (v: unknown, campo?: string): void => {
    if (typeof v === "string") {
      if (v.trim()) textos.push(campo ? `${campo}: ${v.trim()}` : v.trim());
    } else if (Array.isArray(v)) v.forEach((x) => leer(x, campo));
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const propio = o.details ?? o.detail ?? o.message ?? o.title;
      if (typeof propio === "string") leer(propio, campo);
      else for (const [k, x] of Object.entries(o)) leer(x, k);
    }
  };
  if (cuerpo && typeof cuerpo === "object") {
    const o = cuerpo as Record<string, unknown>;
    leer(o.errors ?? o.error ?? o.message);
  } else leer(cuerpo);
  const unicos = [...new Set(textos)];
  return unicos.length ? unicos.join(" ").slice(0, 600) : null;
}
