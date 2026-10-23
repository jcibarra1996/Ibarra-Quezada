export function Monograma({ tamano = 32, invertido = false }: { tamano?: number; invertido?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center rounded-[8px] font-serif font-semibold ${invertido ? "bg-crema text-tinta" : "bg-tinta text-white"}`}
      style={{ width: tamano, height: tamano, fontSize: tamano * 0.46, letterSpacing: "-0.02em" }}
    >
      I<span className="text-terracota">Q</span>
    </span>
  );
}

export function Logo({ invertido = false }: { invertido?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Monograma invertido={invertido} />
      <span className="leading-none">
        <span className={`block font-serif text-[16px] font-semibold tracking-tight ${invertido ? "text-white" : "text-tinta"}`}>IQ Contratos</span>
        <span className={`mt-1 block text-[10.5px] uppercase tracking-[0.14em] ${invertido ? "text-sobre-tinta-tenue" : "text-secundario"}`}>Ibarra Quezada</span>
      </span>
    </span>
  );
}
