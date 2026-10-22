import Link from "next/link";
import type { ComponentProps } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";
const estilos: Record<Variante, string> = {
  primario: "bg-terracota text-white hover:bg-terracota-oscuro border border-terracota",
  secundario: "bg-white text-tinta border border-linea-fuerte hover:bg-gris-50",
  fantasma: "bg-transparent text-secundario border border-transparent hover:bg-gris-50 hover:text-tinta",
  peligro: "bg-white text-burgundy border border-linea-fuerte hover:bg-burgundy-suave",
};
const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 h-8 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

export function Boton({ variante = "secundario", className = "", ...props }: ComponentProps<"button"> & { variante?: Variante }) {
  return <button className={`${base} ${estilos[variante]} ${className}`} {...props} />;
}

export function BotonEnlace({
  variante = "secundario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link className={`${base} ${estilos[variante]} ${className}`} {...props} />;
}
