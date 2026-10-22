"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { vincularExpediente } from "@/app/(app)/expedientes/acciones";
import { NuevoExpediente } from "@/components/expedientes/nuevo-expediente";

export function SelectorExpediente({
  contratoId,
  parte,
  actual,
  opciones,
}: {
  contratoId: string;
  parte: "propia" | "contraparte";
  actual: string | null;
  opciones: { id: string; denominacion: string }[];
}) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const vincular = (id: string | null) =>
    iniciar(async () => {
      setError("");
      const r = await vincularExpediente(contratoId, parte, id);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-[12px] text-secundario" htmlFor={`exp-${parte}`}>
        Expediente vinculado
      </label>
      <select
        id={`exp-${parte}`}
        value={actual ?? ""}
        disabled={pendiente}
        onChange={(e) => vincular(e.target.value || null)}
        className="h-8 max-w-[260px] rounded-md border border-linea-fuerte bg-white px-2 text-[13px] outline-none focus:border-terracota"
      >
        <option value="">Sin expediente</option>
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.denominacion}
          </option>
        ))}
      </select>
      {parte === "contraparte" && <NuevoExpediente texto="Crear expediente" variante="secundario" alCrear={(id) => vincular(id)} />}
      {error && <span className="text-[12px] text-burgundy">{error}</span>}
    </div>
  );
}
