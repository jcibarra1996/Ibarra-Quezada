"use client";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { marcarFirmado } from "@/app/(app)/contratos/[id]/acciones";

export function RegistrarFirma({ contratoId, hoy }: { contratoId: string; hoy: string }) {
  const [fecha, setFecha] = useState(hoy);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <input type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha de firma" className="h-8 rounded-md border border-linea-fuerte px-2 text-[13px]" />
      <Boton
        variante="primario"
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            const r = await marcarFirmado(contratoId, fecha);
            setError(r.ok ? "" : r.error);
          })
        }
      >
        Registrar firma
      </Boton>
      {error && <span className="text-[12px] text-burgundy">{error}</span>}
    </span>
  );
}
