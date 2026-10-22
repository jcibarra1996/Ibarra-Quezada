"use client";
import { useState } from "react";
import { Boton } from "@/components/ui/boton";

// Copia el enlace interno del contrato. Solo lo abre quien tenga cuenta en la organización.
export function BotonCompartir() {
  const [copiado, setCopiado] = useState(false);
  return (
    <Boton
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href.split("?")[0]);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
      title="Copia el enlace interno. Solo puede abrirlo personal de su organización con sesión iniciada."
    >
      {copiado ? "Enlace copiado" : "Compartir"}
    </Boton>
  );
}
