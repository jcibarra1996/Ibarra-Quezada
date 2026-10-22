"use client";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { EtiquetaRiesgo } from "@/components/ui/etiquetas";
import { diferencias } from "@/lib/revision/diferencias";
import { fechaHora } from "@/lib/formato";
import { ESTADOS_HALLAZGO } from "@/lib/tipos";
import type { Hallazgo } from "@/lib/revision/cargar";
import { decidirHallazgo } from "@/app/(app)/contratos/[id]/acciones";

const TIPO: Record<Hallazgo["tipo"], string> = {
  desviacion_playbook: "Desviación del playbook",
  ajena_al_objeto: "No corresponde al objeto del contrato",
  omision: "Falta en el contrato",
};

export function ControlDeCambios({ original, propuesto }: { original: string; propuesto: string }) {
  return (
    <p className="font-serif text-[14px] leading-relaxed">
      {diferencias(original, propuesto).map((t, i) =>
        t.tipo === "eliminado" ? (
          <del key={i} className="text-burgundy decoration-burgundy/70">{t.texto}</del>
        ) : t.tipo === "agregado" ? (
          <ins key={i} className="bg-bajo-suave text-bajo underline decoration-bajo underline-offset-2">{t.texto}</ins>
        ) : (
          <span key={i}>{t.texto}</span>
        ),
      )}
    </p>
  );
}

export function TarjetaHallazgo({
  h,
  activa,
  puedeValidar,
  perfiles,
  alSeleccionar,
}: {
  h: Hallazgo;
  activa: boolean;
  puedeValidar: boolean;
  perfiles: Record<string, { nombre: string }>;
  alSeleccionar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(h.texto_final ?? h.redaccion_propuesta);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  const decidir = (estado: Hallazgo["estado"], textoFinal?: string) =>
    iniciar(async () => {
      setError("");
      const r = await decidirHallazgo(h.id, estado, textoFinal);
      if (!r.ok) setError(r.error);
      else setEditando(false);
    });

  const propuestoVigente = h.estado === "editado" && h.texto_final ? h.texto_final : h.redaccion_propuesta;
  const decidido = h.estado !== "pendiente";

  return (
    <article
      id={`hallazgo-${h.id}`}
      onClick={alSeleccionar}
      className={`rounded-lg border bg-white p-4 transition-colors ${activa ? "border-terracota ring-1 ring-terracota" : "border-linea hover:border-linea-fuerte"} ${
        decidido && !activa ? "opacity-75" : ""
      }`}
    >
      <header className="mb-2 flex items-start gap-2.5">
        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${h.riesgo === "alto" ? "bg-burgundy text-white" : "bg-crema text-terracota-oscuro"}`}>
          {h.numero}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-[13.5px] font-semibold">{h.tema}</h3>
            <EtiquetaRiesgo riesgo={h.riesgo} />
          </div>
          <p className="text-[12px] text-secundario">
            {h.tipo === "omision" ? "Cláusula nueva" : `Cláusula ${h.clausula}`} · {TIPO[h.tipo]}
          </p>
        </div>
      </header>

      <p className="text-[13px] leading-relaxed text-tinta">{h.explicacion}</p>

      {h.referencias_normativas.length > 0 && (
        <ul className="mt-2 space-y-1">
          {h.referencias_normativas.map((r) => (
            <li key={r} className="flex items-start gap-2 text-[12px]">
              <span className="shrink-0 rounded bg-medio-suave px-1.5 py-px font-medium text-medio">Por verificar por el abogado</span>
              <span className="text-secundario">{r}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 rounded-md border border-linea bg-lienzo p-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-secundario">
          {h.tipo === "omision" ? "Cláusula propuesta" : h.estado === "editado" ? "Cambio editado por Legal" : "Cambio propuesto"}
        </p>
        {editando ? (
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            rows={6}
            className="w-full rounded border border-linea-fuerte bg-white p-2 font-serif text-[14px] leading-relaxed outline-none focus:border-terracota"
            aria-label="Redacción final"
          />
        ) : (
          <ControlDeCambios original={h.cita ?? ""} propuesto={propuestoVigente} />
        )}
      </div>

      {error && <p className="mt-2 text-[12.5px] text-burgundy">{error}</p>}

      <footer className="mt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {decidido ? (
          <>
            <span className="text-[12px] text-secundario">
              <span className="font-medium text-tinta">{ESTADOS_HALLAZGO[h.estado]}</span>
              {h.decidido_por && ` por ${perfiles[h.decidido_por]?.nombre ?? "Usuario"}`} · {fechaHora(h.decidido_en)}
            </span>
            {puedeValidar && (
              <button className="ml-auto text-[12px] text-secundario underline-offset-2 hover:text-tinta hover:underline" onClick={() => decidir("pendiente")} disabled={pendiente}>
                Reabrir
              </button>
            )}
          </>
        ) : puedeValidar ? (
          editando ? (
            <>
              <Boton variante="primario" disabled={pendiente || !texto.trim()} onClick={() => decidir("editado", texto)}>
                Guardar redacción
              </Boton>
              <Boton variante="fantasma" onClick={() => setEditando(false)} disabled={pendiente}>
                Cancelar
              </Boton>
            </>
          ) : (
            <>
              <Boton variante="primario" disabled={pendiente} onClick={() => decidir("aceptado")}>
                Aceptar cambio
              </Boton>
              <Boton disabled={pendiente} onClick={() => setEditando(true)}>
                Editar
              </Boton>
              <Boton variante="fantasma" disabled={pendiente} onClick={() => decidir("descartado")}>
                Descartar
              </Boton>
            </>
          )
        ) : (
          <span className="text-[12px] text-secundario">Pendiente de validación por Legal</span>
        )}
      </footer>
    </article>
  );
}
