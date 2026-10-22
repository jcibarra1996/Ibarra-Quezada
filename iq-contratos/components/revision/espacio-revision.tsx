"use client";
import { useState } from "react";
import { VisorContrato, type SeccionVista } from "./visor";
import { PanelAnalisis, type AnalisisVista } from "./panel-analisis";
import { EstadoAnalisis } from "./estado-analisis";
import { BotonReanalizar } from "./boton-reanalizar";
import { fechaHora } from "@/lib/formato";
import type { Hallazgo } from "@/lib/revision/cargar";

export function EspacioRevision({
  contratoId,
  secciones,
  paginas,
  paginasVirtuales,
  analisis,
  hallazgos,
  puedeValidar,
  perfiles,
  inicial,
  cerrado,
}: {
  contratoId: string;
  secciones: SeccionVista[];
  paginas: number;
  paginasVirtuales: boolean;
  analisis: (AnalisisVista & { error: string | null }) | null;
  hallazgos: Hallazgo[];
  puedeValidar: boolean;
  perfiles: Record<string, { nombre: string }>;
  inicial: string | null;
  cerrado: boolean;
}) {
  const [activa, setActiva] = useState<string | null>(inicial);
  const completado = analisis?.estado === "completado";
  const notas = completado
    ? hallazgos
        .filter((h) => h.cita_inicio !== null && h.cita_fin !== null)
        .map((h) => ({ id: h.id, numero: h.numero, riesgo: h.riesgo, inicio: h.cita_inicio!, fin: h.cita_fin!, sectionId: h.section_id, tema: h.tema, estado: h.estado }))
    : [];

  return (
    <div className="flex min-h-0 flex-1">
      <VisorContrato secciones={secciones} paginas={paginas} paginasVirtuales={paginasVirtuales} notas={notas} activa={activa} alSeleccionar={setActiva} />
      <aside className="flex w-[430px] shrink-0 flex-col border-l border-linea bg-white" aria-label="Análisis IA">
        <div className="flex items-baseline justify-between border-b border-linea px-5 py-3">
          <h2 className="text-[15px] font-semibold">Análisis IA</h2>
          {completado && (
            <span className="flex items-baseline gap-3">
              <span className="text-[11.5px] text-secundario">{fechaHora(analisis!.creado_en)}</span>
              {puedeValidar && !cerrado && <BotonReanalizar contratoId={contratoId} />}
            </span>
          )}
        </div>
        {completado ? (
          <PanelAnalisis analisis={analisis!} hallazgos={hallazgos} activa={activa} alSeleccionar={setActiva} puedeValidar={puedeValidar} perfiles={perfiles} />
        ) : cerrado && !analisis ? (
          <p className="m-5 rounded-lg border border-linea bg-lienzo p-4 text-[13px] text-secundario">
            Este contrato se aprobó sin análisis de IA. Para analizarlo, regréselo primero a En negociación.
          </p>
        ) : (
          <div className="p-5">
            <EstadoAnalisis
              contratoId={contratoId}
              estado={!analisis ? "sin_analisis" : analisis.estado === "error" ? "error" : "en_proceso"}
              error={analisis?.error}
              autoIniciar
              puedeReintentar
            />
          </div>
        )}
      </aside>
    </div>
  );
}
