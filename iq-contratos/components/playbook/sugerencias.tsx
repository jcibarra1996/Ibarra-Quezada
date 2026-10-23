"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { guardarPosicion } from "@/app/(app)/playbook/acciones";
import type { SugerenciaPosicion } from "@/lib/ai/sugerencia-playbook";
import { camposDe, NotaSugerencia, pedirSugerencias } from "./ia";
import { Posicion } from "./posicion";

function TarjetaSugerencia({ playbookId, s, alQuitar }: { playbookId: string; s: SugerenciaPosicion; alQuitar: () => void }) {
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const router = useRouter();

  if (editando) {
    return (
      <div className="space-y-2">
        <NotaSugerencia s={s} />
        <Posicion
          playbookId={playbookId}
          posicion={camposDe(s)}
          editable
          nueva
          alTerminar={(guardada) => (guardada ? alQuitar() : setEditando(false))}
        />
      </div>
    );
  }

  return (
    <article className="rounded-lg border border-dashed border-terracota bg-white p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold">{s.tema}</h3>
        <span className="rounded-full bg-terracota-suave px-2 py-px text-[11.5px] font-medium text-terracota-oscuro">Sugerida por la IA</span>
      </header>
      <dl className="grid grid-cols-3 gap-4 text-[13px]">
        <div>
          <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-bajo">Preferida</dt>
          <dd className="leading-relaxed">{s.preferida}</dd>
        </div>
        <div>
          <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-medio">Respaldo aceptable</dt>
          <dd className="leading-relaxed">{s.respaldo}</dd>
        </div>
        <div>
          <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-burgundy">Nunca se acepta</dt>
          <dd className="leading-relaxed">{s.nunca_se_acepta}</dd>
        </div>
      </dl>
      {s.clausula_modelo && (
        <div className="mt-4 rounded-md border border-linea bg-lienzo p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-secundario">Cláusula modelo</p>
          <p className="whitespace-pre-line font-serif text-[14px] leading-relaxed">{s.clausula_modelo}</p>
        </div>
      )}
      <div className="mt-3">
        <NotaSugerencia s={s} />
      </div>
      {error && <p className="mt-2 text-[13px] text-burgundy">{error}</p>}
      <footer className="mt-4 flex items-center gap-2">
        <Boton
          variante="primario"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const r = await guardarPosicion(playbookId, null, camposDe(s));
              if (!r.ok) return setError(r.error);
              alQuitar();
              router.refresh();
            })
          }
        >
          Agregar al playbook
        </Boton>
        <Boton disabled={pendiente} onClick={() => setEditando(true)}>
          Editar antes de agregar
        </Boton>
        <Boton variante="fantasma" disabled={pendiente} onClick={alQuitar}>
          Descartar
        </Boton>
      </footer>
    </article>
  );
}

export function SugerirPosiciones({ playbookId }: { playbookId: string }) {
  const [sugerencias, setSugerencias] = useState<(SugerenciaPosicion & { clave: number })[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function sugerir() {
    setCargando(true);
    setError("");
    try {
      const nuevas = await pedirSugerencias({ playbook_id: playbookId });
      setSugerencias(nuevas.map((s, i) => ({ ...s, clave: Date.now() + i })));
      if (nuevas.length === 0) setError("La IA no encontró temas nuevos para este playbook.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible obtener sugerencias.");
    }
    setCargando(false);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-linea bg-white px-4 py-3">
        <p className="text-[13px] text-secundario">
          La IA revisa los temas de este playbook y propone los que faltan, con qué preferir, qué aceptar de respaldo y qué nunca aceptar. Nada se agrega sin su
          revisión.
        </p>
        <Boton onClick={sugerir} disabled={cargando} className="shrink-0">
          {cargando ? "Preparando sugerencias..." : "Sugerir posiciones con IA"}
        </Boton>
      </div>
      {cargando && <p className="text-[12.5px] text-secundario">Suele tardar menos de un minuto.</p>}
      {error && <p className="text-[13px] text-burgundy">{error}</p>}
      {sugerencias.map((s) => (
        <TarjetaSugerencia key={s.clave} playbookId={playbookId} s={s} alQuitar={() => setSugerencias((l) => l.filter((x) => x.clave !== s.clave))} />
      ))}
    </section>
  );
}
