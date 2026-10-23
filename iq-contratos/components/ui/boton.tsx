import Link from "next/link";
import type { ComponentProps } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";
const estilos: Record<Variante, string> = {
  primario: "bg-terracota text-white border border-terracota hover:bg-terracota-oscuro hover:border-terracota-oscuro shadow-[0_1px_2px_rgb(184_70_26/0.25)]",
  secundario: "bg-white text-tinta border border-linea-fuerte hover:bg-gris-50 hover:border-secundario/40",
  fantasma: "bg-transparent text-secundario border border-transparent hover:bg-gris-50 hover:text-tinta",
  peligro: "bg-white text-burgundy border border-linea-fuerte hover:bg-burgundy-suave hover:border-burgundy/30",
};
// Deshabilitado siempre en gris: un botón de color pálido parece activo y no tiene contraste.
const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 h-9 text-[13.5px] font-medium transition-colors whitespace-nowrap disabled:pointer-events-none disabled:bg-gris-100 disabled:text-secundario/70 disabled:border-gris-100 disabled:shadow-none";

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
