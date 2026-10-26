"use client";
import { useTransition } from "react";
import { actualizarAlerta } from "@/app/(app)/vencimientos/acciones";

export function AreaAlerta({ alertaId, areaId, areas, editable }: { alertaId: string; areaId: string | null; areas: { id: string; nombre: string }[]; editable: boolean }) {
  const [pendiente, iniciar] = useTransition();
  if (!editable) return <span>{areas.find((a) => a.id === areaId)?.nombre ?? "Sin asignar"}</span>;
  return (
    <select
      aria-label="Área responsable"
      defaultValue={areaId ?? ""}
      disabled={pendiente}
      onChange={(e) => iniciar(async () => void (await actualizarAlerta(alertaId, { area_id: e.target.value || null })))}
      className="h-7 rounded-md border border-linea-fuerte bg-white px-1.5 text-[12.5px] outline-none focus:border-mandarina"
    >
      <option value="">Sin asignar</option>
      {areas.map((a) => (
        <option key={a.id} value={a.id}>
          {a.nombre}
        </option>
      ))}
    </select>
  );
}

export function EstadoAlerta({ alertaId, estado, editable }: { alertaId: string; estado: string; editable: boolean }) {
  const [pendiente, iniciar] = useTransition();
  if (!editable) return <span className="text-secundario">{estado === "activa" ? "Activa" : "Atendida"}</span>;
  return estado === "activa" ? (
    <button
      disabled={pendiente}
      onClick={() => iniciar(async () => void (await actualizarAlerta(alertaId, { estado: "atendida" })))}
      className="h-7 rounded-md border border-linea-fuerte bg-white px-2.5 text-[12.5px] font-medium hover:bg-gris-50"
    >
      Marcar atendida
    </button>
  ) : (
    <button
      disabled={pendiente}
      onClick={() => iniciar(async () => void (await actualizarAlerta(alertaId, { estado: "activa" })))}
      className="text-[12.5px] text-secundario underline-offset-2 hover:text-tinta hover:underline"
    >
      Atendida · reabrir
    </button>
  );
}
