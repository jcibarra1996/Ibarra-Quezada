export function EncabezadoPagina({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-linea bg-white px-8 pb-5 pt-7">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-1 text-[13.5px] text-secundario">{descripcion}</p>}
      </div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </header>
  );
}
