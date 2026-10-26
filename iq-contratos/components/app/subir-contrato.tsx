"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { subirTemporal } from "@/lib/subir-archivo";

type Fase = "inactivo" | "subiendo" | "error";

export function SubirContrato({
  areas,
  ancho = true,
  texto = "Subir contrato",
  variante = "primario",
  control,
}: {
  // Abierto desde otro lugar (menú "Nuevo contrato"): sin botón propio.
  control?: { abierto: boolean; alCambiar: (abierto: boolean) => void };
  areas: { id: string; nombre: string }[];
  ancho?: boolean;
  texto?: string;
  variante?: "primario" | "secundario";
}) {
  const [abiertoPropio, setAbiertoPropio] = useState(false);
  const abierto = control ? control.abierto : abiertoPropio;
  const setAbierto = control ? control.alCambiar : setAbiertoPropio;
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fase, setFase] = useState<Fase>("inactivo");
  const [error, setError] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const cerrar = () => {
    if (fase === "subiendo") return;
    setAbierto(false);
    setArchivo(null);
    setFase("inactivo");
    setError("");
  };

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!archivo) return;
    const formulario = new FormData(e.currentTarget);
    setFase("subiendo");
    setError("");
    let ruta: string;
    try {
      ruta = await subirTemporal(archivo);
    } catch (err) {
      setFase("error");
      setError(err instanceof Error ? err.message : "No fue posible subir el archivo.");
      return;
    }
    const r = await fetch("/api/contratos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruta, nombre: archivo.name, contraparte: formulario.get("contraparte"), area_id: formulario.get("area_id") }),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      setFase("error");
      setError(cuerpo.error ?? "No fue posible procesar el archivo.");
      return;
    }
    router.push(`/contratos/${cuerpo.id}?pestana=documento`);
    router.refresh();
    setAbierto(false);
    setArchivo(null);
    setFase("inactivo");
  }

  return (
    <>
      {!control && (
      <Boton variante={variante} className={ancho ? "w-full h-9" : ""} onClick={() => setAbierto(true)}>
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
          <path d="M10 13.5V4M6 7.5 10 3.5l4 4M4 16.5h12" />
        </svg>
        {texto}
      </Boton>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/30 px-4" onClick={cerrar}>
          <form
            onSubmit={enviar}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[520px] rounded-xl border border-linea bg-white p-6 text-tinta shadow-[var(--shadow-flotante)]"
            role="dialog"
            aria-modal
            aria-labelledby="titulo-subir"
          >
            <h2 id="titulo-subir" className="titulo text-[20px]">Subir contrato</h2>
            <p className="mt-1 text-[13px] text-secundario">PDF con texto seleccionable o Word (.docx), hasta 20 MB. El archivo se guarda en almacenamiento privado.</p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastrando(false);
                const f = e.dataTransfer.files[0];
                if (f) setArchivo(f);
              }}
              onClick={() => input.current?.click()}
              className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-8 text-center transition-colors ${
                arrastrando ? "border-mandarina bg-mandarina-suave" : "border-linea-fuerte bg-lienzo hover:border-secundario"
              }`}
            >
              {archivo ? (
                <>
                  <span className="text-[14px] font-medium">{archivo.name}</span>
                  <span className="mt-1 text-[12px] text-secundario">{(archivo.size / 1024 / 1024).toFixed(2)} MB · haga clic para cambiarlo</span>
                </>
              ) : (
                <>
                  <span className="text-[14px] font-medium">Arrastre el archivo aquí</span>
                  <span className="mt-1 text-[12px] text-secundario">o haga clic para seleccionarlo</span>
                </>
              )}
              <input
                ref={input}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-secundario">Contraparte (opcional)</span>
                <input name="contraparte" placeholder="Se detecta del proemio" className="h-9 w-full rounded-md border border-linea-fuerte px-2.5 text-[13px] outline-none focus:border-mandarina" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-secundario">Área responsable</span>
                <select name="area_id" className="h-9 w-full rounded-md border border-linea-fuerte bg-white px-2 text-[13px] outline-none focus:border-mandarina">
                  <option value="">Sin asignar</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error && <p className="mt-4 rounded-md bg-riesgo-suave px-3 py-2 text-[13px] text-riesgo">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <Boton type="button" variante="fantasma" onClick={cerrar} disabled={fase === "subiendo"}>
                Cancelar
              </Boton>
              <Boton type="submit" variante="primario" disabled={!archivo || fase === "subiendo"}>
                {fase === "subiendo" ? "Leyendo el contrato..." : "Subir y leer"}
              </Boton>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
