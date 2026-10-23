import Link from "next/link";

export const PESTANAS = [
  { clave: "ficha", texto: "Ficha" },
  { clave: "documento", texto: "Documento" },
  { clave: "hallazgos", texto: "Hallazgos" },
  { clave: "partes", texto: "Partes y expedientes" },
  { clave: "versiones", texto: "Versiones" },
  { clave: "comentarios", texto: "Comentarios" },
  { clave: "historial", texto: "Historial" },
] as const;
export type Pestana = (typeof PESTANAS)[number]["clave"];

export function Pestanas({
  base,
  activa,
  conteos,
  ocultar = [],
}: {
  base: string;
  activa: Pestana;
  conteos: Partial<Record<Pestana, number>>;
  ocultar?: Pestana[];
}) {
  return (
    <nav className="flex gap-1 border-b border-linea bg-white px-8" aria-label="Secciones del contrato">
      {PESTANAS.filter((p) => !ocultar.includes(p.clave)).map((p) => (
        <Link
          key={p.clave}
          href={p.clave === "ficha" ? base : `${base}?pestana=${p.clave}`}
          aria-current={activa === p.clave ? "page" : undefined}
          className={`-mb-px flex h-10 items-center gap-1.5 border-b-2 px-3 text-[13.5px] ${
            activa === p.clave ? "border-terracota font-medium text-tinta" : "border-transparent text-secundario hover:text-tinta"
          }`}
        >
          {p.texto}
          {conteos[p.clave] ? <span className="rounded bg-gris-100 px-1.5 text-[11px] font-medium text-secundario">{conteos[p.clave]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
