"use client";
import { useEffect } from "react";
import { TarjetaHallazgo } from "./tarjeta-hallazgo";
import { TIPOS_CONTRATO, type TipoContrato } from "@/lib/tipos";
import type { Hallazgo } from "@/lib/revision/cargar";

export interface AnalisisVista {
  id: string;
  estado: string;
  modelo: string;
  resumen_negocio: string | null;
  tipo_detectado: string | null;
  objeto_detectado: string | null;
  hallazgos_descartados_sin_cita: number;
  creado_en: string;
}

export function Contadores({ hallazgos }: { hallazgos: Hallazgo[] }) {
  const n = (r: string) => hallazgos.filter((h) => h.riesgo === r).length;
  const caja = "flex-1 rounded-md border border-linea px-3 py-2";
  return (
    <div className="flex gap-2">
      <div className={caja}>
        <p className="text-[20px] font-semibold leading-none text-burgundy">{n("alto")}</p>
        <p className="mt-1 text-[11.5px] text-secundario">Riesgo alto</p>
      </div>
      <div className={caja}>
        <p className="text-[20px] font-semibold leading-none text-medio">{n("medio")}</p>
        <p className="mt-1 text-[11.5px] text-secundario">Riesgo medio</p>
      </div>
      <div className={caja}>
        <p className="text-[20px] font-semibold leading-none text-bajo">{n("bajo")}</p>
        <p className="mt-1 text-[11.5px] text-secundario">Riesgo bajo</p>
      </div>
    </div>
  );
}

export function ValidacionLegal({ hallazgos }: { hallazgos: Hallazgo[] }) {
  const validados = hallazgos.filter((h) => h.estado !== "pendiente").length;
  const total = hallazgos.length;
  const altos = hallazgos.filter((h) => h.riesgo === "alto" && h.estado === "pendiente").length;
  const pct = total ? Math.round((validados / total) * 100) : 0;
  return (
    <div className="border-t border-linea bg-white px-5 py-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="text-[13px] font-semibold">Validación de Legal</p>
        <p className="text-[12px] text-secundario">
          {validados} de {total} hallazgos validados
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gris-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-terracota transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[12px] text-secundario">
        {altos > 0
          ? `${altos} hallazgo${altos === 1 ? "" : "s"} de riesgo alto pendiente${altos === 1 ? "" : "s"}: el contrato no puede pasar a Aprobado.`
          : total > 0
            ? "Sin hallazgos de riesgo alto pendientes."
            : ""}
      </p>
    </div>
  );
}

export function PanelAnalisis({
  analisis,
  hallazgos,
  activa,
  alSeleccionar,
  puedeValidar,
  perfiles,
}: {
  analisis: AnalisisVista;
  hallazgos: Hallazgo[];
  activa: string | null;
  alSeleccionar: (id: string) => void;
  puedeValidar: boolean;
  perfiles: Record<string, { nombre: string }>;
}) {
  useEffect(() => {
    if (activa) document.getElementById(`hallazgo-${activa}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activa]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">
        {analisis.resumen_negocio && (
          <section className="rounded-lg bg-crema px-4 py-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-terracota-oscuro">Resumen para el negocio</p>
            <p className="text-[13.5px] leading-relaxed">{analisis.resumen_negocio}</p>
          </section>
        )}
        {analisis.tipo_detectado && (
          <p className="text-[12.5px] text-secundario">
            <span className="font-medium text-tinta">{TIPOS_CONTRATO[analisis.tipo_detectado as TipoContrato]}.</span> {analisis.objeto_detectado}
          </p>
        )}
        <Contadores hallazgos={hallazgos} />
        {analisis.hallazgos_descartados_sin_cita > 0 && (
          <p className="rounded-md border border-linea px-3 py-2 text-[12px] text-secundario">
            Se omitieron {analisis.hallazgos_descartados_sin_cita} hallazgo{analisis.hallazgos_descartados_sin_cita === 1 ? "" : "s"} porque la IA no
            citó el texto exacto del contrato.
          </p>
        )}
        {hallazgos.length === 0 && <p className="text-[13px] text-secundario">La IA no encontró desviaciones respecto del playbook. Revise el documento de todas formas.</p>}
        <div className="space-y-3">
          {hallazgos.map((h) => (
            <TarjetaHallazgo key={h.id} h={h} activa={activa === h.id} puedeValidar={puedeValidar} perfiles={perfiles} alSeleccionar={() => alSeleccionar(h.id)} />
          ))}
        </div>
      </div>
      <ValidacionLegal hallazgos={hallazgos} />
    </div>
  );
}
