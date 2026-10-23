export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  antetitulo,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: React.ReactNode;
  antetitulo?: string;
}) {
  return (
    <header className="border-b border-linea bg-white px-8 pb-6 pt-8">
      <div className="mx-auto flex max-w-[1280px] items-end justify-between gap-6">
        <div className="min-w-0">
          {antetitulo && <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-terracota-oscuro">{antetitulo}</p>}
          <h1 className="titulo text-[30px] leading-tight">{titulo}</h1>
          {descripcion && <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-secundario">{descripcion}</p>}
        </div>
        {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
      </div>
    </header>
  );
}
