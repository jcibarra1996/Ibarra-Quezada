"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "@/lib/corporativo/campos";
import { subirTemporal } from "@/lib/subir-archivo";

// Carga un documento corporativo y espera a que la IA lo lea.
export function SubirDocumento({ expedienteId, alTerminar }: { expedienteId: string; alTerminar?: () => void }) {
  const [tipo, setTipo] = useState<TipoDocumento>("acta_constitutiva");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function enviar() {
    if (!archivo) return;
    setEnviando(true);
    setMensaje(null);
    let ruta: string;
    try {
      ruta = await subirTemporal(archivo);
    } catch (e) {
      setEnviando(false);
      return setMensaje({ tipo: "error", texto: e instanceof Error ? e.message : "No fue posible subir el archivo." });
    }
    const r = await fetch(`/api/expedientes/${expedienteId}/documentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruta, nombre: archivo.name, tipo }),
    });
    const cuerpo = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) return setMensaje({ tipo: "error", texto: cuerpo.error ?? "No fue posible cargar el documento." });
    if (cuerpo.error) setMensaje({ tipo: "error", texto: `El documento se guardó, pero no se pudo leer: ${cuerpo.error}` });
    else
      setMensaje({
        tipo: "ok",
        texto: cuerpo.cambios ? `Listo: se integraron ${cuerpo.cambios} datos al expediente. Revíselos antes de validar.` : "Listo: el documento no aportó datos nuevos.",
      });
    setArchivo(null);
    if (input.current) input.current.value = "";
    router.refresh();
    alTerminar?.();
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-linea-fuerte bg-lienzo p-3">
      <p className="text-[12.5px] font-medium">Cargar documento</p>
      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value as TipoDocumento)}
        className="h-8 w-full rounded-md border border-linea-fuerte bg-white px-2 text-[13px] outline-none focus:border-mandarina"
        aria-label="Tipo de documento"
      >
        {Object.entries(TIPOS_DOCUMENTO).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        className="block w-full text-[12.5px] text-secundario file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:border file:border-linea-fuerte file:bg-white file:px-3 file:text-[12.5px] file:font-medium file:text-tinta hover:file:bg-gris-50"
      />
      <p className="text-[11.5px] text-secundario">PDF (también escaneado), Word o fotografía JPG/PNG, hasta 20 MB.</p>
      <Boton variante="primario" className="w-full" disabled={!archivo || enviando} onClick={enviar}>
        {enviando ? "La IA está leyendo el documento..." : "Subir y extraer datos"}
      </Boton>
      {mensaje && <p className={`text-[12.5px] ${mensaje.tipo === "ok" ? "text-bajo" : "text-riesgo"}`}>{mensaje.texto}</p>}
    </div>
  );
}
