"use client";
import { useState, useTransition } from "react";
import { EtiquetaEstado } from "@/components/ui/etiquetas";
import { ESTADOS, ORDEN_ESTADOS, type EstadoContrato } from "@/lib/tipos";
import { cambiarEstado } from "@/app/(app)/contratos/[id]/acciones";

export function SelectorEstado({ contratoId, estado, editable }: { contratoId: string; estado: string; editable: boolean }) {
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  if (!editable) return <EtiquetaEstado estado={estado as EstadoContrato} />;
  return (
    <span className="inline-flex items-center gap-2">
      <select
        aria-label="Estado del contrato"
        value={estado}
        disabled={pendiente}
        onChange={(e) => {
          const nuevo = e.target.value as EstadoContrato;
          iniciar(async () => {
            setError("");
            const r = await cambiarEstado(contratoId, nuevo);
            if (!r.ok) setError(r.error);
          });
        }}
        className="h-7 rounded-full border border-linea-fuerte bg-white pl-2.5 pr-7 text-[12px] font-medium outline-none focus:border-mandarina"
      >
        {/* En negociación no se elige a mano: lo marca la descarga de la contrapropuesta. */}
        {ORDEN_ESTADOS.map((e) => (
          <option key={e} value={e} disabled={e === "en_negociacion" && estado !== e}>
            {e === "en_negociacion" && estado !== e ? `${ESTADOS[e]} (al descargar la contrapropuesta)` : ESTADOS[e]}
          </option>
        ))}
      </select>
      {error && <span role="alert" className="text-[12px] text-riesgo">{error}</span>}
    </span>
  );
}
