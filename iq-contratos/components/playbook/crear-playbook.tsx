"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { crearPlaybook } from "@/app/(app)/playbook/acciones";
import { TIPOS_CONTRATO, type TipoContrato } from "@/lib/tipos";

export function CrearPlaybook({ disponibles }: { disponibles: TipoContrato[] }) {
  const [pendiente, iniciar] = useTransition();
  const router = useRouter();
  if (disponibles.length === 0) return null;
  return (
    <select
      aria-label="Crear reglas para otro tipo de contrato"
      disabled={pendiente}
      value=""
      onChange={(e) => {
        const tipo = e.target.value as TipoContrato;
        iniciar(async () => {
          const r = await crearPlaybook(tipo);
          if (r.ok) router.push(`/playbook?tipo=${tipo}`);
        });
      }}
      className="h-8 rounded-md border border-linea-fuerte bg-white px-2 text-[13px]"
    >
      <option value="">Nuevas reglas para...</option>
      {disponibles.map((t) => (
        <option key={t} value={t}>
          {TIPOS_CONTRATO[t]}
        </option>
      ))}
    </select>
  );
}
