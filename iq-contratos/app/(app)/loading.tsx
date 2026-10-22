// Se muestra al instante mientras el servidor prepara la página.
export default function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="border-b border-linea bg-white px-8 pb-5 pt-7">
        <div className="h-6 w-56 animate-pulse rounded bg-gris-100" />
        <div className="mt-2.5 h-3.5 w-96 animate-pulse rounded bg-gris-50" />
      </div>
      <div className="space-y-3 px-8 py-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg border border-linea bg-white" />
        ))}
      </div>
    </div>
  );
}
