"use client";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { CAMPOS } from "@/lib/corporativo/campos";
import type { CampoNegocio, RolPlantilla } from "@/lib/plantillas/llenar";
import { guardarPlantilla } from "@/app/(app)/plantillas/acciones";

export function EditorPlantilla(p: { id: string; nombre: string; descripcion: string; cuerpo: string; campos: CampoNegocio[]; roles: RolPlantilla[] }) {
  const [nombre, setNombre] = useState(p.nombre);
  const [descripcion, setDescripcion] = useState(p.descripcion);
  const [cuerpo, setCuerpo] = useState(p.cuerpo);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const control = "w-full rounded-md border border-linea-fuerte bg-white px-2.5 text-[13px] outline-none focus:border-mandarina";
  const codigo = "rounded bg-gris-100 px-1 font-mono text-[11.5px]";
  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col gap-3 px-8 py-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-secundario">Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={`${control} h-9`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-secundario">Descripción</span>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${control} h-9`} />
          </label>
        </div>
        <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} className={`${control} min-h-0 flex-1 py-3 font-titulo text-[14px] leading-relaxed`} aria-label="Texto de la plantilla" />
        <div className="flex items-center justify-end gap-3">
          {mensaje && <span className={`text-[12.5px] ${mensaje.ok ? "text-bajo" : "text-riesgo"}`}>{mensaje.texto}</span>}
          <Boton
            variante="primario"
            disabled={pendiente}
            onClick={() =>
              iniciar(async () => {
                setMensaje(null);
                const r = await guardarPlantilla(p.id, { nombre, descripcion, cuerpo });
                setMensaje(r.ok ? { ok: true, texto: "Plantilla guardada; la versión aumentó." } : { ok: false, texto: r.error });
              })
            }
          >
            {pendiente ? "Guardando..." : "Guardar plantilla"}
          </Boton>
        </div>
      </div>
      <aside className="w-[340px] shrink-0 space-y-4 overflow-auto border-l border-linea bg-white px-5 py-5 text-[12.5px]">
        <section>
          <h2 className="mb-1.5 text-[13px] font-semibold">Partes</h2>
          {p.roles.map((r) => (
            <div key={r.clave} className="mb-2">
              <p className="font-medium">
                {r.termino} {r.propia ? "(la empresa)" : "(contraparte)"}
              </p>
              <p className="text-secundario">
                <code className={codigo}>{`{{${r.clave}.proemio}}`}</code> <code className={codigo}>{`{{${r.clave}.comparecencia}}`}</code>{" "}
                <code className={codigo}>{`{{${r.clave}.declaraciones}}`}</code> <code className={codigo}>{`{{${r.clave}.denominacion}}`}</code>{" "}
                <code className={codigo}>{`{{${r.clave}.rfc}}`}</code>
              </p>
            </div>
          ))}
          <p className="text-secundario">
            Cualquier dato del expediente: {CAMPOS.slice(0, 4).map((c) => c.clave).join(", ")}, etc. Por ejemplo <code className={codigo}>{`{{${p.roles[0]?.clave}.domicilio}}`}</code>.
          </p>
        </section>
        <section>
          <h2 className="mb-1.5 text-[13px] font-semibold">Datos del negocio</h2>
          <ul className="space-y-1">
            {p.campos.map((c) => (
              <li key={c.clave}>
                <code className={codigo}>{`{{negocio.${c.clave}}}`}</code> <span className="text-secundario">{c.etiqueta}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-1.5 text-[13px] font-semibold">Cierre</h2>
          <p className="text-secundario">
            <code className={codigo}>{"{{lugar_firma}}"}</code> <code className={codigo}>{"{{fecha_firma}}"}</code> <code className={codigo}>{"{{firmas}}"}</code>
          </p>
        </section>
        <p className="rounded-md bg-mandarina-suave px-3 py-2 text-secundario">
          Use el formato mexicano: proemio, declaraciones y cláusulas. Un dato que falte en el expediente aparece como pendiente en el contrato generado.
        </p>
      </aside>
    </div>
  );
}
