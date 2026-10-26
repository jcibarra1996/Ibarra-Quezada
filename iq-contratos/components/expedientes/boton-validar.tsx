"use client";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { validarExpediente } from "@/app/(app)/expedientes/acciones";

export function BotonValidar({ id, validado }: { id: string; validado: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-[12px] text-riesgo">{error}</span>}
      <Boton
        variante={validado ? "secundario" : "primario"}
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            setError("");
            const r = await validarExpediente(id, !validado);
            if (!r.ok) setError(r.error);
          })
        }
      >
        {validado ? "Regresar a revisión" : "Validar datos"}
      </Boton>
    </span>
  );
}
