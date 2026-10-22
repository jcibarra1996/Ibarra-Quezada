export function Monograma({ tamano = 32 }: { tamano?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-[6px] bg-tinta font-serif font-semibold text-white"
      style={{ width: tamano, height: tamano, fontSize: tamano * 0.46, letterSpacing: "-0.02em" }}
    >
      I<span className="text-terracota">Q</span>
    </span>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Monograma />
      <span className="text-[15px] font-semibold tracking-tight text-tinta">IQ Contratos</span>
    </span>
  );
}
