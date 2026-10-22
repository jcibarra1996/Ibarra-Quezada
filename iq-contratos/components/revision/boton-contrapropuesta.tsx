"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/components/ui/boton";

export function BotonContrapropuesta({
  contratoId,
  cambios,
  altosPendientes,
  habilitado,
}: {
  contratoId: string;
  cambios: number;
  altosPendientes: number;
  habilitado: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function generar() {
    setGenerando(true);
    setError("");
    const r = await fetch(`/api/contratos/${contratoId}/contrapropuesta`, { method: "POST" });
    const cuerpo = await r.json().catch(() => ({}));
    setGenerando(false);
    if (!r.ok) return setError(cuerpo.error ?? "No fue posible generar la contrapropuesta.");
    window.location.href = `/api/contrapropuestas/${cuerpo.id}`;
    setAbierto(false);
    router.refresh();
  }

  return (
    <>
      <Boton
        variante="primario"
        disabled={!habilitado || cambios === 0}
        title={!habilitado ? "Solo Legal genera contrapropuestas" : cambios === 0 ? "Acepte o edite al menos un cambio" : undefined}
        onClick={() => setAbierto(true)}
      >
        Enviar contrapropuesta
      </Boton>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/30 px-4" onClick={() => !generando && setAbierto(false)}>
          <div className="w-full max-w-[480px] rounded-lg border border-linea bg-white p-6 shadow-xl" role="dialog" aria-modal aria-labelledby="titulo-cp" onClick={(e) => e.stopPropagation()}>
            <h2 id="titulo-cp" className="text-[17px] font-semibold tracking-tight">Contrapropuesta en Word</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-secundario">
              Se genera un .docx con {cambios} cambio{cambios === 1 ? "" : "s"} validado{cambios === 1 ? "" : "s"} como control de cambios de Word, a nombre de quien los aceptó. No incluye
              las explicaciones internas. Descárguelo, revíselo y envíelo a la contraparte; el contrato pasará a En negociación.
            </p>
            {altosPendientes > 0 && (
              <p className="mt-3 rounded-md bg-burgundy-suave px-3 py-2 text-[13px] text-burgundy">
                Quedan {altosPendientes} hallazgo{altosPendientes === 1 ? "" : "s"} de riesgo alto sin validar. No se incluirán en la contrapropuesta.
              </p>
            )}
            {error && <p className="mt-3 text-[13px] text-burgundy">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Boton variante="fantasma" onClick={() => setAbierto(false)} disabled={generando}>
                Cancelar
              </Boton>
              <Boton variante="primario" onClick={generar} disabled={generando}>
                {generando ? "Generando..." : "Generar y descargar"}
              </Boton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
