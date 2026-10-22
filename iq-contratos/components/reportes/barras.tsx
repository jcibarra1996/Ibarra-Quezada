// Barras horizontales de una sola serie: la longitud codifica la cantidad y la etiqueta
// muestra el valor exacto, así que el color nunca es la única fuente de información.
export function Barras({
  filas,
  color = "bg-terracota",
  vacio,
}: {
  filas: { etiqueta: string; valor: number; detalle?: string; color?: string }[];
  color?: string;
  vacio: string;
}) {
  const maximo = Math.max(1, ...filas.map((f) => f.valor));
  if (filas.length === 0 || filas.every((f) => f.valor === 0)) return <p className="text-[13px] text-secundario">{vacio}</p>;
  return (
    <ul className="space-y-2.5">
      {filas.map((f) => (
        <li key={f.etiqueta} className="grid grid-cols-[minmax(0,170px)_1fr_auto] items-center gap-3 text-[13px]" title={`${f.etiqueta}: ${f.valor}${f.detalle ? ` (${f.detalle})` : ""}`}>
          <span className="truncate text-tinta">{f.etiqueta}</span>
          <span className="h-3 rounded-r bg-gris-50">
            <span className={`block h-3 rounded-r-[4px] ${f.color ?? color}`} style={{ width: `${(f.valor / maximo) * 100}%` }} />
          </span>
          <span className="w-16 text-right tabular-nums text-secundario">
            <span className="font-medium text-tinta">{f.valor}</span>
            {f.detalle ? <span className="block text-[11px]">{f.detalle}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
