"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Un análisis nuevo reemplaza al vigente: sus hallazgos empiezan pendientes de validar.
export function BotonReanalizar({ contratoId }: { contratoId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  return (
    <button
      className="text-[11.5px] text-secundario underline-offset-2 hover:text-tinta hover:underline disabled:opacity-50"
      disabled={enviando}
      onClick={() => {
        if (!window.confirm("Se hará un análisis nuevo con el playbook y los expedientes vigentes. Las validaciones del análisis actual quedarán en el historial y los hallazgos nuevos empezarán pendientes. ¿Continuar?")) return;
        setEnviando(true);
        void fetch(`/api/contratos/${contratoId}/analizar`, { method: "POST" }).finally(() => router.refresh());
        setTimeout(() => router.refresh(), 1500);
      }}
    >
      {enviando ? "Iniciando..." : "Volver a analizar"}
    </button>
  );
}
