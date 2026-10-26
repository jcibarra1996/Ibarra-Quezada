"use client";
import type { CamposPosicion } from "@/app/(app)/playbook/acciones";
import type { SugerenciaPosicion } from "@/lib/ai/sugerencia-playbook";

export async function pedirSugerencias(cuerpo: {
  playbook_id: string;
  tema?: string;
  posicion_id?: string;
  borrador?: Partial<CamposPosicion>;
}): Promise<SugerenciaPosicion[]> {
  const r = await fetch("/api/playbook/sugerir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error ?? "No fue posible obtener sugerencias.");
  return datos.posiciones ?? [];
}

export const camposDe = (s: SugerenciaPosicion): CamposPosicion => ({
  tema: s.tema,
  preferida: s.preferida,
  respaldo: s.respaldo,
  nunca_se_acepta: s.nunca_se_acepta,
  clausula_modelo: s.clausula_modelo,
});

// Lo que la dirección jurídica debe revisar de una sugerencia antes de adoptarla.
export function NotaSugerencia({ s }: { s: Pick<SugerenciaPosicion, "referencias_normativas" | "por_verificar"> }) {
  return (
    <div className="rounded-md bg-mandarina-suave px-3 py-2 text-[12.5px] leading-relaxed">
      <p className="font-medium text-mandarina-texto">Sugerencia de la IA: revísela antes de guardarla.</p>
      {s.referencias_normativas.length > 0 && <p className="mt-1 text-secundario">Relacionado con: {s.referencias_normativas.join("; ")}.</p>}
      {s.por_verificar && <p className="mt-1 text-secundario">Por verificar: {s.por_verificar}</p>}
    </div>
  );
}
