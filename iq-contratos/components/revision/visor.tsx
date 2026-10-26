"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { fragmentar, type Marca } from "@/lib/revision/fragmentos";

export interface SeccionVista {
  id: string;
  tipo: string;
  etiqueta: string;
  titulo: string | null;
  texto: string;
  inicio: number;
  pagina: number;
}

export interface NotaMargen {
  id: string;
  numero: number;
  riesgo: Marca["riesgo"];
  inicio: number;
  fin: number;
  sectionId: string | null;
  tema: string;
  estado: string;
}

function Parrafos({ seccion, marcas, activa, alSeleccionar }: { seccion: SeccionVista; marcas: Marca[]; activa: string | null; alSeleccionar: (id: string) => void }) {
  const fragmentos = fragmentar(seccion.texto, seccion.inicio, marcas);
  return (
    <p className="whitespace-pre-line">
      {fragmentos.map((f, i) =>
        f.marca ? (
          <mark
            key={i}
            id={`cita-${f.marca.id}`}
            className="resaltado cursor-pointer"
            data-riesgo={f.marca.riesgo}
            data-activo={activa === f.marca.id}
            onClick={() => alSeleccionar(f.marca!.id)}
          >
            {f.texto}
            <sup className="ml-0.5 select-none font-sans text-[10px] font-semibold text-mandarina-texto">{f.marca.numero}</sup>
          </mark>
        ) : (
          <Fragment key={i}>{f.texto}</Fragment>
        ),
      )}
    </p>
  );
}

export function VisorContrato({
  secciones,
  paginas,
  paginasVirtuales,
  notas = [],
  activa = null,
  alSeleccionar = () => {},
}: {
  secciones: SeccionVista[];
  paginas: number;
  paginasVirtuales: boolean;
  notas?: NotaMargen[];
  activa?: string | null;
  alSeleccionar?: (id: string) => void;
}) {
  const [pagina, setPagina] = useState(1);
  const marcas = useMemo<Marca[]>(() => notas.map((n) => ({ id: n.id, numero: n.numero, riesgo: n.riesgo, inicio: n.inicio, fin: n.fin })), [notas]);

  // Al seleccionar un hallazgo desde el panel, ir a su página y mostrar la cita.
  useEffect(() => {
    if (!activa) return;
    const nota = notas.find((n) => n.id === activa);
    if (!nota) return;
    const seccion = secciones.find((s) => s.inicio <= nota.inicio && nota.inicio < s.inicio + s.texto.length);
    if (seccion && seccion.pagina !== pagina) setPagina(seccion.pagina);
    const t = setTimeout(() => document.getElementById(`cita-${activa}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    return () => clearTimeout(t);
  }, [activa]);

  const visibles = secciones.filter((s) => s.pagina === pagina);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto bg-gris-50 px-6 py-6">
        <article className="texto-contrato mx-auto max-w-[760px] rounded-sm border border-linea bg-white px-14 py-12 shadow-[0_1px_2px_rgba(32,24,22,0.04)]">
          {visibles.map((s) => {
            const notasSeccion = notas.filter((n) => n.inicio >= s.inicio && n.inicio < s.inicio + s.texto.length);
            if (s.tipo === "encabezado") {
              return (
                <h2 key={s.id} className="my-6 text-center text-[14px] font-semibold tracking-[0.25em]">
                  {s.texto}
                </h2>
              );
            }
            return (
              <section key={s.id} className="relative mb-5" data-etiqueta={s.etiqueta}>
                {notasSeccion.length > 0 && (
                  <div className="absolute -left-11 top-0.5 flex flex-col gap-1 font-sans">
                    {notasSeccion.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => alSeleccionar(n.id)}
                        title={n.tema}
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                          activa === n.id ? "bg-mandarina text-tinta" : n.riesgo === "alto" ? "bg-riesgo text-white" : "bg-mandarina-suave text-mandarina-texto"
                        } ${n.estado !== "pendiente" ? "opacity-50" : ""}`}
                      >
                        {n.numero}
                      </button>
                    ))}
                  </div>
                )}
                <div className={s.tipo === "proemio" ? "text-justify font-medium" : "text-justify"}>
                  <Parrafos seccion={s} marcas={marcas} activa={activa} alSeleccionar={alSeleccionar} />
                </div>
              </section>
            );
          })}
        </article>
      </div>
      <nav className="flex items-center justify-between border-t border-linea bg-white px-5 py-2 text-[12.5px] text-secundario" aria-label="Paginación">
        <span>{paginasVirtuales ? "Páginas de lectura (el archivo Word no trae paginación fija)" : "Páginas del documento original"}</span>
        <div className="flex items-center gap-1">
          <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} className="h-7 rounded px-2 hover:bg-gris-50 disabled:opacity-40">
            Anterior
          </button>
          {Array.from({ length: paginas }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPagina(p)}
              aria-current={p === pagina ? "page" : undefined}
              className={`h-7 min-w-7 rounded px-1.5 ${p === pagina ? "bg-tinta text-white" : "hover:bg-gris-50"}`}
            >
              {p}
            </button>
          ))}
          <button disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)} className="h-7 rounded px-2 hover:bg-gris-50 disabled:opacity-40">
            Siguiente
          </button>
        </div>
      </nav>
    </div>
  );
}
