"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { abreNegociacion } from "@/lib/tipos";
import { abrirContrapropuesta } from "./descargar-contrapropuesta";

export function BotonContrapropuesta({
  contratoId,
  cambios,
  altosPendientes,
  habilitado,
  estado,
}: {
  contratoId: string;
  estado: string;
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
    if (!r.ok) {
      setGenerando(false);
      return setError(cuerpo.error ?? "No fue posible generar la contrapropuesta.");
    }
    try {
      await abrirContrapropuesta(cuerpo.id);
      setAbierto(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible descargar la contrapropuesta.");
    }
    setGenerando(false);
    router.refresh();
  }

  const abre = abreNegociacion(estado);

  return (
    <>
      <Boton
        variante="primario"
        disabled={!habilitado || cambios === 0}
        title={!habilitado ? "Solo Legal genera contrapropuestas" : cambios === 0 ? "Acepte o edite al menos un cambio" : undefined}
        onClick={() => setAbierto(true)}
      >
        Descargar contrapropuesta
      </Boton>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/30 px-4" onClick={() => !generando && setAbierto(false)}>
          <div className="w-full max-w-[480px] rounded-xl border border-linea bg-white p-6 shadow-[var(--shadow-flotante)]" role="dialog" aria-modal aria-labelledby="titulo-cp" onClick={(e) => e.stopPropagation()}>
            <h2 id="titulo-cp" className="titulo text-[20px]">Contrapropuesta en Word</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-secundario">
              Se genera un .docx con {cambios} cambio{cambios === 1 ? "" : "s"} validado{cambios === 1 ? "" : "s"} como control de cambios de Word, a nombre de quien los aceptó. No incluye
              las explicaciones internas. Revíselo y envíelo a la contraparte.
            </p>
            <p className="mt-3 rounded-md bg-mandarina-suave px-3 py-2 text-[13px] text-mandarina-texto">
              {abre
                ? "Al descargarlo, el contrato pasa a En negociación y así lo verá quien lo solicitó."
                : estado === "en_negociacion"
                  ? "El contrato ya está En negociación; esta contrapropuesta queda registrada en Versiones."
                  : "El estado del contrato no cambia; esta contrapropuesta queda registrada en Versiones."}
            </p>
            {altosPendientes > 0 && (
              <p className="mt-3 rounded-md bg-riesgo-suave px-3 py-2 text-[13px] text-riesgo">
                Quedan {altosPendientes} hallazgo{altosPendientes === 1 ? "" : "s"} de riesgo alto sin validar. No se incluirán en la contrapropuesta.
              </p>
            )}
            {error && <p className="mt-3 text-[13px] text-riesgo">{error}</p>}
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
