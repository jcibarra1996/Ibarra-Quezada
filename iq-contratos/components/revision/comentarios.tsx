"use client";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { fechaHora, iniciales } from "@/lib/formato";
import { comentar } from "@/app/(app)/contratos/[id]/acciones";

type Comentario = { id: string; autor_id: string; audiencia: string; cuerpo: string; creado_en: string; finding_id: string | null };

export function Comentarios({
  contratoId,
  comentarios,
  perfiles,
  hallazgos,
}: {
  contratoId: string;
  comentarios: Comentario[];
  perfiles: Record<string, { nombre: string; rol: string }>;
  hallazgos: { id: string; numero: number; tema: string }[];
}) {
  const [texto, setTexto] = useState("");
  const [hallazgo, setHallazgo] = useState("");
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const tema = (id: string | null) => hallazgos.find((h) => h.id === id);

  return (
    <div className="max-w-3xl space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => {
            const r = await comentar(contratoId, texto, hallazgo || null);
            if (!r.ok) return setError(r.error);
            setTexto("");
            setHallazgo("");
            setError("");
          });
        }}
        className="rounded-lg border border-linea bg-white p-4"
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder="Escriba un comentario para el equipo legal o el área de negocio"
          aria-label="Comentario"
          className="w-full rounded-md border border-linea-fuerte p-2.5 text-[13.5px] outline-none focus:border-mandarina"
        />
        <div className="mt-2 flex items-center gap-2">
          <select value={hallazgo} onChange={(e) => setHallazgo(e.target.value)} aria-label="Hallazgo relacionado" className="h-8 rounded-md border border-linea-fuerte bg-white px-2 text-[13px]">
            <option value="">Sobre el contrato en general</option>
            {hallazgos.map((h) => (
              <option key={h.id} value={h.id}>
                Hallazgo {h.numero}: {h.tema}
              </option>
            ))}
          </select>
          {error && <span className="text-[12.5px] text-riesgo">{error}</span>}
          <Boton type="submit" variante="primario" className="ml-auto" disabled={pendiente || !texto.trim()}>
            Comentar
          </Boton>
        </div>
      </form>

      {comentarios.length === 0 && <p className="text-[13.5px] text-secundario">Aún no hay comentarios.</p>}
      <ol className="space-y-3">
        {comentarios.map((c) => {
          const autor = perfiles[c.autor_id];
          const h = tema(c.finding_id);
          return (
            <li key={c.id} className="flex gap-3 rounded-lg border border-linea bg-white p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gris-100 text-[11px] font-semibold">{iniciales(autor?.nombre ?? "")}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">
                  <span className="font-medium">{autor?.nombre ?? "Usuario"}</span>
                  <span className={`ml-2 rounded px-1.5 py-px text-[11px] font-medium ${c.audiencia === "negocio" ? "bg-mandarina-suave text-mandarina-texto" : "bg-gris-100 text-secundario"}`}>
                    {c.audiencia === "negocio" ? "Negocio" : "Legal"}
                  </span>
                  <span className="ml-2 text-[12px] text-secundario">{fechaHora(c.creado_en)}</span>
                </p>
                {h && <p className="mt-0.5 text-[12px] text-secundario">Sobre el hallazgo {h.numero}: {h.tema}</p>}
                <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed">{c.cuerpo}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
