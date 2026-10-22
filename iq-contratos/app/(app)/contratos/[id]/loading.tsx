export default function CargandoContrato() {
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Cargando el contrato">
      <div className="border-b border-linea bg-white px-8 py-5">
        <div className="h-6 w-80 animate-pulse rounded bg-gris-100" />
        <div className="mt-2.5 h-3.5 w-64 animate-pulse rounded bg-gris-50" />
      </div>
      <div className="h-10 border-b border-linea bg-white" />
      <div className="flex min-h-0 flex-1">
        <div className="flex-1 space-y-3 p-10">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-gris-100" style={{ width: `${92 - i * 6}%` }} />
          ))}
        </div>
        <div className="w-[430px] shrink-0 space-y-3 border-l border-linea bg-white p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-linea bg-lienzo" />
          ))}
        </div>
      </div>
    </div>
  );
}
