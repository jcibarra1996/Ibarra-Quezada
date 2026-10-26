"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Pide el enlace firmado, inicia la descarga y refresca la vista, porque descargarla puede
// pasar el contrato a En negociación.
export async function abrirContrapropuesta(id: string) {
  const r = await fetch(`/api/contrapropuestas/${id}`, { method: "POST" });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.error ?? "No fue posible descargar la contrapropuesta.");
  window.location.href = cuerpo.url;
}

export function DescargarContrapropuesta({ id }: { id: string }) {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <span className="inline-flex items-center gap-2">
      {error && <span role="alert" className="text-[12.5px] text-riesgo">{error}</span>}
      <button
        type="button"
        disabled={descargando}
        onClick={async () => {
          setDescargando(true);
          setError("");
          try {
            await abrirContrapropuesta(id);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "No fue posible descargar la contrapropuesta.");
          }
          setDescargando(false);
        }}
        className="text-[13px] font-medium text-mandarina-texto hover:underline disabled:opacity-60"
      >
        {descargando ? "Preparando..." : "Descargar .docx"}
      </button>
    </span>
  );
}
