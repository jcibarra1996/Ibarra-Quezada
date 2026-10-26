"use client";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { eliminarPosicion, guardarPosicion, type CamposPosicion } from "@/app/(app)/playbook/acciones";
import type { SugerenciaPosicion } from "@/lib/ai/sugerencia-playbook";
import { camposDe, NotaSugerencia, pedirSugerencias } from "./ia";

const CAMPOS: { clave: keyof CamposPosicion; etiqueta: string; filas: number; serif?: boolean }[] = [
  { clave: "preferida", etiqueta: "Posición preferida", filas: 3 },
  { clave: "respaldo", etiqueta: "Posición aceptable de respaldo", filas: 3 },
  { clave: "nunca_se_acepta", etiqueta: "Nunca se acepta", filas: 3 },
  { clave: "clausula_modelo", etiqueta: "Cláusula modelo aprobada", filas: 6, serif: true },
];

export function Posicion({
  playbookId,
  posicion,
  editable,
  nueva = false,
  alTerminar,
}: {
  playbookId: string;
  posicion: CamposPosicion & { id?: string };
  editable: boolean;
  nueva?: boolean;
  // Recibe si la posición se guardó (true) o se canceló (false).
  alTerminar?: (guardada: boolean) => void;
}) {
  const [editando, setEditando] = useState(nueva);
  const [valores, setValores] = useState<CamposPosicion>(posicion);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const [sugiriendo, setSugiriendo] = useState(false);
  const [nota, setNota] = useState<SugerenciaPosicion | null>(null);

  async function sugerir() {
    setSugiriendo(true);
    setError("");
    try {
      const [s] = await pedirSugerencias({ playbook_id: playbookId, tema: valores.tema, posicion_id: posicion.id, borrador: valores });
      if (!s) throw new Error("La IA no devolvió una propuesta. Intente de nuevo.");
      setValores({ ...camposDe(s), tema: valores.tema });
      setNota(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible obtener la sugerencia.");
    }
    setSugiriendo(false);
  }

  const guardar = () =>
    iniciar(async () => {
      const r = await guardarPosicion(playbookId, posicion.id ?? null, valores);
      if (!r.ok) return setError(r.error);
      setError("");
      setEditando(false);
      setNota(null);
      alTerminar?.(true);
    });

  if (!editando) {
    return (
      <article className="rounded-lg border border-linea bg-white p-5">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">{posicion.tema}</h3>
          {editable && (
            <Boton variante="fantasma" onClick={() => setEditando(true)}>
              Editar
            </Boton>
          )}
        </header>
        <dl className="grid grid-cols-3 gap-4 text-[13px]">
          <div>
            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-bajo">Preferida</dt>
            <dd className="leading-relaxed">{posicion.preferida || "Sin definir"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-medio">Respaldo aceptable</dt>
            <dd className="leading-relaxed">{posicion.respaldo || "Sin definir"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-riesgo">Nunca se acepta</dt>
            <dd className="leading-relaxed">{posicion.nunca_se_acepta || "Sin definir"}</dd>
          </div>
        </dl>
        {posicion.clausula_modelo && (
          <div className="mt-4 rounded-md border border-linea bg-lienzo p-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-secundario">Cláusula modelo aprobada</p>
            <p className="font-titulo text-[14px] leading-relaxed">{posicion.clausula_modelo}</p>
          </div>
        )}
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-mandarina bg-white p-5">
      <label className="mb-3 block">
        <span className="mb-1 block text-[12px] font-medium text-secundario">Tema</span>
        <input
          value={valores.tema}
          onChange={(e) => setValores({ ...valores, tema: e.target.value })}
          placeholder="Por ejemplo: Intereses moratorios"
          className="h-9 w-full rounded-md border border-linea-fuerte px-2.5 text-[14px] font-medium outline-none focus:border-mandarina"
        />
      </label>
      {nota && (
        <div className="mb-3">
          <NotaSugerencia s={nota} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {CAMPOS.map((c) => (
          <label key={c.clave} className={`block ${c.clave === "clausula_modelo" ? "col-span-2" : ""}`}>
            <span className="mb-1 block text-[12px] font-medium text-secundario">{c.etiqueta}</span>
            <textarea
              value={valores[c.clave]}
              onChange={(e) => setValores({ ...valores, [c.clave]: e.target.value })}
              rows={c.filas}
              className={`w-full rounded-md border border-linea-fuerte p-2.5 text-[13px] leading-relaxed outline-none focus:border-mandarina ${c.serif ? "font-titulo text-[14px]" : ""}`}
            />
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-[13px] text-riesgo">{error}</p>}
      <footer className="mt-4 flex items-center gap-2">
        <Boton variante="primario" onClick={guardar} disabled={pendiente || sugiriendo}>
          Guardar
        </Boton>
        <Boton
          variante="fantasma"
          disabled={pendiente || sugiriendo}
          onClick={() => {
            setValores(posicion);
            setNota(null);
            setEditando(false);
            alTerminar?.(false);
          }}
        >
          Cancelar
        </Boton>
        <Boton
          onClick={sugerir}
          disabled={pendiente || sugiriendo || !valores.tema.trim()}
          title={valores.tema.trim() ? "La IA propone o mejora esta posición; usted revisa antes de guardar" : "Escriba primero el tema"}
        >
          {sugiriendo ? "Preparando sugerencia..." : "Sugerir con IA"}
        </Boton>
        {posicion.id && (
          <Boton
            variante="peligro"
            className="ml-auto"
            disabled={pendiente}
            onClick={() => {
              if (!confirm(`¿Eliminar la posición "${posicion.tema}" de las reglas?`)) return;
              iniciar(async () => {
                const r = await eliminarPosicion(posicion.id!);
                if (!r.ok) setError(r.error);
              });
            }}
          >
            Eliminar
          </Boton>
        )}
      </footer>
    </article>
  );
}

export function AgregarPosicion({ playbookId }: { playbookId: string }) {
  const [abierta, setAbierta] = useState(false);
  if (!abierta)
    return (
      <Boton onClick={() => setAbierta(true)} className="w-full border-dashed">
        Agregar posición
      </Boton>
    );
  return (
    <Posicion
      playbookId={playbookId}
      posicion={{ tema: "", preferida: "", respaldo: "", nunca_se_acepta: "", clausula_modelo: "" }}
      editable
      nueva
      alTerminar={() => setAbierta(false)}
    />
  );
}
