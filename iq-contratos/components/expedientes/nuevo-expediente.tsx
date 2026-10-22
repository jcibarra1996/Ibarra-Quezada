"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { crearExpediente } from "@/app/(app)/expedientes/acciones";

export function NuevoExpediente({
  texto = "Nuevo expediente",
  alCrear,
  variante = "primario",
}: {
  texto?: string;
  alCrear?: (id: string, denominacion: string) => void;
  variante?: "primario" | "secundario";
}) {
  const [abierto, setAbierto] = useState(false);
  const [denominacion, setDenominacion] = useState("");
  const [tipo, setTipo] = useState<"moral" | "fisica">("moral");
  const [rfc, setRfc] = useState("");
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const router = useRouter();
  const campo = "h-9 w-full rounded-md border border-linea-fuerte bg-white px-2.5 text-[13px] outline-none focus:border-terracota";

  const crear = () =>
    iniciar(async () => {
      setError("");
      const r = await crearExpediente({ denominacion, tipo_persona: tipo, rfc });
      if (!r.ok) return setError(r.error);
      setAbierto(false);
      if (alCrear) alCrear(r.id!, denominacion.trim());
      else router.push(`/expedientes/${r.id}`);
    });

  return (
    <>
      <Boton type="button" variante={variante} onClick={() => setAbierto(true)}>
        {texto}
      </Boton>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/30 px-4" onClick={() => !pendiente && setAbierto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[460px] rounded-lg border border-linea bg-white p-6 shadow-xl" role="dialog" aria-modal aria-labelledby="titulo-expediente">
            <h2 id="titulo-expediente" className="text-[17px] font-semibold tracking-tight">Nuevo expediente corporativo</h2>
            <p className="mt-1 text-[13px] text-secundario">Después podrá cargar el acta constitutiva, poderes y demás documentos. La IA extrae los datos y Legal los valida.</p>
            <div className="mt-5 space-y-3">
              <div className="flex gap-2">
                {(["moral", "fisica"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`h-8 flex-1 rounded-md border text-[13px] ${tipo === t ? "border-terracota bg-terracota-suave font-medium" : "border-linea-fuerte text-secundario"}`}
                  >
                    {t === "moral" ? "Persona moral" : "Persona física"}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-secundario">{tipo === "moral" ? "Denominación o razón social" : "Nombre completo"}</span>
                <input value={denominacion} onChange={(e) => setDenominacion(e.target.value)} className={campo} placeholder={tipo === "moral" ? "PROVEEDOR XYZ, S.A. DE C.V." : ""} autoFocus />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-secundario">RFC (opcional)</span>
                <input value={rfc} onChange={(e) => setRfc(e.target.value)} className={`${campo} font-mono uppercase`} maxLength={13} />
              </label>
            </div>
            {error && <p className="mt-3 text-[13px] text-burgundy">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Boton type="button" variante="fantasma" onClick={() => setAbierto(false)} disabled={pendiente}>
                Cancelar
              </Boton>
              <Boton type="button" variante="primario" onClick={crear} disabled={pendiente || denominacion.trim().length < 2}>
                {pendiente ? "Creando..." : "Crear expediente"}
              </Boton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
