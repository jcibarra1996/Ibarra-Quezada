"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Boton } from "@/components/ui/boton";

// Carga la respuesta de la contraparte como nueva versión. El análisis corre de nuevo sobre ella.
export function NuevaVersion({ contratoId }: { contratoId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function subir(archivo: File) {
    setSubiendo(true);
    setError("");
    const datos = new FormData();
    datos.set("archivo", archivo);
    datos.set("contrato_id", contratoId);
    const r = await fetch("/api/contratos", { method: "POST", body: datos });
    const cuerpo = await r.json().catch(() => ({}));
    setSubiendo(false);
    if (!r.ok) return setError(cuerpo.error ?? "No fue posible cargar la versión.");
    router.push(`/contratos/${contratoId}`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-linea bg-white px-4 py-3">
      <p className="flex-1 text-[13px] text-secundario">¿La contraparte respondió? Cargue su versión: se convierte en la vigente y la IA la analiza de nuevo.</p>
      {error && <span className="text-[12.5px] text-burgundy">{error}</span>}
      <Boton onClick={() => input.current?.click()} disabled={subiendo}>
        {subiendo ? "Leyendo..." : "Cargar nueva versión"}
      </Boton>
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void subir(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
