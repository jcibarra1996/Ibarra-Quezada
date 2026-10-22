"use client";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { camposDe, TIPOS_DOCUMENTO, type DatosExpediente, type FuentesExpediente, type TipoPersona } from "@/lib/corporativo/campos";
import { guardarExpediente } from "@/app/(app)/expedientes/acciones";

const GRUPOS = ["Constitución", "Representación", "Datos fiscales y domicilio"] as const;

export function FormularioExpediente({
  id,
  tipo,
  denominacion: denominacionInicial,
  rfc: rfcInicial,
  datos: datosIniciales,
  fuentes,
  documentos,
}: {
  id: string;
  tipo: TipoPersona;
  denominacion: string;
  rfc: string;
  datos: DatosExpediente;
  fuentes: FuentesExpediente;
  documentos: Record<string, string>;
}) {
  const [denominacion, setDenominacion] = useState(denominacionInicial);
  const [rfc, setRfc] = useState(rfcInicial);
  const [datos, setDatos] = useState<DatosExpediente>(datosIniciales);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const campos = camposDe(tipo);
  const cambiado =
    denominacion !== denominacionInicial || rfc !== rfcInicial || campos.some((c) => (datos[c.clave] ?? "") !== (datosIniciales[c.clave] ?? ""));
  const control = "w-full rounded-md border border-linea-fuerte bg-white px-2.5 text-[13px] outline-none focus:border-terracota";

  const guardar = () =>
    iniciar(async () => {
      setMensaje(null);
      const r = await guardarExpediente(id, { denominacion, rfc, datos, enPantalla: datosIniciales });
      setMensaje(r.ok ? { ok: true, texto: "Cambios guardados." } : { ok: false, texto: r.error });
    });

  return (
    <div className="rounded-lg border border-linea bg-white">
      <div className="grid grid-cols-[1fr_200px] gap-3 border-b border-linea p-5">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-secundario">{tipo === "moral" ? "Denominación o razón social" : "Nombre completo"}</span>
          <input value={denominacion} onChange={(e) => setDenominacion(e.target.value)} className={`${control} h-9`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-secundario">RFC</span>
          <input value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} maxLength={13} className={`${control} h-9 font-mono`} />
        </label>
      </div>
      {GRUPOS.map((g) => {
        const lista = campos.filter((c) => c.grupo === g);
        if (!lista.length) return null;
        return (
          <section key={g} className="border-b border-linea p-5 last:border-b-0">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-secundario">{g}</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {lista.map((c) => {
                const f = fuentes[c.clave];
                const vacio = !datos[c.clave]?.trim();
                return (
                  <label key={c.clave} className={`block ${c.tipo === "largo" ? "col-span-2" : ""}`}>
                    <span className="mb-1 flex items-baseline justify-between gap-2 text-[12px] font-medium text-secundario">
                      <span>{c.etiqueta}</span>
                      {f ? (
                        <span className="truncate font-normal text-bajo" title={f.cita ?? undefined}>
                          {TIPOS_DOCUMENTO[f.tipo]}
                          {f.pagina ? `, p. ${f.pagina}` : ""}
                        </span>
                      ) : vacio ? (
                        <span className="font-normal text-medio">Falta</span>
                      ) : (
                        <span className="font-normal">Capturado</span>
                      )}
                    </span>
                    {c.tipo === "largo" ? (
                      <textarea
                        rows={3}
                        value={datos[c.clave] ?? ""}
                        onChange={(e) => setDatos({ ...datos, [c.clave]: e.target.value })}
                        className={`${control} py-2 leading-relaxed`}
                      />
                    ) : (
                      <input
                        type={c.tipo === "fecha" ? "date" : "text"}
                        value={datos[c.clave] ?? ""}
                        onChange={(e) => setDatos({ ...datos, [c.clave]: e.target.value })}
                        className={`${control} h-9`}
                      />
                    )}
                    {f?.cita && (
                      <span className="mt-1 block truncate font-serif text-[12px] italic text-secundario" title={`${documentos[f.documento_id] ?? ""}: ${f.cita}`}>
                        «{f.cita}»
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}
      <div className="flex items-center justify-end gap-3 border-t border-linea bg-lienzo px-5 py-3">
        {mensaje && <span className={`text-[12.5px] ${mensaje.ok ? "text-bajo" : "text-burgundy"}`}>{mensaje.texto}</span>}
        <Boton variante="primario" onClick={guardar} disabled={!cambiado || pendiente}>
          {pendiente ? "Guardando..." : "Guardar cambios"}
        </Boton>
      </div>
    </div>
  );
}
