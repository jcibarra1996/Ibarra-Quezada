"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Boton } from "@/components/ui/boton";
import { asignarResponsable, confirmarFicha, guardarFicha, terminarContrato } from "@/app/(app)/contratos/[id]/ficha-acciones";
import { TIPOS_CONTRATO } from "@/lib/tipos";

const control = "h-9 w-full rounded-md border border-linea-fuerte bg-white px-2.5 text-[13.5px] outline-none focus:border-mandarina";

export interface ValoresFormulario {
  tipo_contrato: string;
  objeto: string;
  monto: string;
  moneda: string;
  monto_periodo: string;
  inicio_vigencia: string;
  fin_vigencia: string;
  duracion_meses: string;
  renovacion_automatica: string;
  renovacion_meses: string;
  aviso_dias: string;
  aviso_habiles: string;
  ley_aplicable: string;
  jurisdiccion: string;
}

function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-secundario">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-[11.5px] text-secundario">{ayuda}</span>}
    </label>
  );
}

// Términos clave: se muestran como ficha y, para Legal, se editan en el mismo lugar.
export function TerminosEditables({ contratoId, valores, editable, children }: { contratoId: string; valores: ValoresFormulario; editable: boolean; children: ReactNode }) {
  const [editando, setEditando] = useState(false);
  const [v, setV] = useState(valores);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const cambiar = (k: keyof ValoresFormulario) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  if (!editando) {
    return (
      <section className="rounded-xl border border-linea bg-white">
        <header className="flex items-center justify-between border-b border-linea px-5 py-3">
          <h2 className="titulo text-[18px]">Términos clave</h2>
          {editable && (
            <Boton variante="fantasma" onClick={() => setEditando(true)}>
              Editar
            </Boton>
          )}
        </header>
        {children}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-mandarina bg-white">
      <header className="border-b border-linea px-5 py-3">
        <h2 className="titulo text-[18px]">Términos clave</h2>
        <p className="text-[12.5px] text-secundario">Lo que usted cambie queda como capturado a mano y la IA ya no lo modifica. Al guardar, la ficha queda confirmada a su nombre.</p>
      </header>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 p-5 sm:grid-cols-3">
        <Campo etiqueta="Tipo de contrato">
          <select className={control} value={v.tipo_contrato} onChange={cambiar("tipo_contrato")}>
            <option value="">Por identificar</option>
            {Object.entries(TIPOS_CONTRATO).map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </select>
        </Campo>
        <div className="sm:col-span-2">
          <Campo etiqueta="Objeto">
            <input className={control} value={v.objeto} onChange={cambiar("objeto")} placeholder="Qué se obligan a hacer o dar las partes, en una oración" />
          </Campo>
        </div>
        <Campo etiqueta="Monto">
          <input className={control} inputMode="decimal" placeholder="180000.00" value={v.monto} onChange={cambiar("monto")} />
        </Campo>
        <Campo etiqueta="Moneda">
          <select className={control} value={v.moneda} onChange={cambiar("moneda")}>
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </Campo>
        <Campo etiqueta="El monto es">
          <select className={control} value={v.monto_periodo} onChange={cambiar("monto_periodo")}>
            <option value="total">Total del contrato</option>
            <option value="mensual">Mensual</option>
            <option value="anual">Anual</option>
          </select>
        </Campo>
        <Campo etiqueta="Inicio de vigencia">
          <input type="date" className={control} value={v.inicio_vigencia} onChange={cambiar("inicio_vigencia")} />
        </Campo>
        <Campo etiqueta="Fin de vigencia">
          <input type="date" className={control} value={v.fin_vigencia} onChange={cambiar("fin_vigencia")} />
        </Campo>
        <Campo etiqueta="Duración en meses" ayuda="Si el contrato fija un plazo en lugar de una fecha de término.">
          <input className={control} inputMode="numeric" value={v.duracion_meses} onChange={cambiar("duracion_meses")} />
        </Campo>
        <Campo etiqueta="Renovación automática">
          <select className={control} value={v.renovacion_automatica} onChange={cambiar("renovacion_automatica")}>
            <option value="">No indicada</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </Campo>
        <Campo etiqueta="Meses por renovación">
          <input className={control} inputMode="numeric" value={v.renovacion_meses} onChange={cambiar("renovacion_meses")} />
        </Campo>
        <Campo etiqueta="Aviso de no renovación o terminación">
          <span className="flex gap-2">
            <input className={`${control} w-24`} inputMode="numeric" placeholder="días" value={v.aviso_dias} onChange={cambiar("aviso_dias")} />
            <select className={control} value={v.aviso_habiles} onChange={cambiar("aviso_habiles")}>
              <option value="naturales">días naturales</option>
              <option value="habiles">días hábiles</option>
            </select>
          </span>
        </Campo>
        <div className="sm:col-span-3 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Campo etiqueta="Ley aplicable">
            <input className={control} value={v.ley_aplicable} onChange={cambiar("ley_aplicable")} placeholder="Por ejemplo: Código Civil Federal" />
          </Campo>
          <Campo etiqueta="Jurisdicción">
            <input className={control} value={v.jurisdiccion} onChange={cambiar("jurisdiccion")} placeholder="Por ejemplo: tribunales de la Ciudad de México" />
          </Campo>
        </div>
      </div>
      {error && <p className="px-5 pb-2 text-[13px] text-riesgo">{error}</p>}
      <footer className="flex gap-2 border-t border-linea px-5 py-3">
        <Boton
          variante="primario"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const r = await guardarFicha(contratoId, { ...v });
              if (!r.ok) return setError(r.error);
              setError("");
              setEditando(false);
            })
          }
        >
          {pendiente ? "Guardando..." : "Guardar y confirmar"}
        </Boton>
        <Boton
          variante="fantasma"
          disabled={pendiente}
          onClick={() => {
            setV(valores);
            setError("");
            setEditando(false);
          }}
        >
          Cancelar
        </Boton>
      </footer>
    </section>
  );
}

export function ConfirmarFicha({ contratoId }: { contratoId: string }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-[12.5px] text-riesgo">{error}</span>}
      <Boton
        variante="primario"
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            const r = await confirmarFicha(contratoId);
            if (!r.ok) setError(r.error);
          })
        }
      >
        {pendiente ? "Confirmando..." : "Confirmar ficha"}
      </Boton>
    </span>
  );
}

export function LlenarConIA({ contratoId, texto = "Llenar con IA" }: { contratoId: string; texto?: string }) {
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const router = useRouter();
  return (
    <span className="inline-flex items-center gap-2">
      {mensaje && <span className="text-[12.5px] text-secundario">{mensaje}</span>}
      <Boton
        disabled={trabajando}
        onClick={async () => {
          setTrabajando(true);
          setMensaje("");
          const r = await fetch(`/api/contratos/${contratoId}/ficha`, { method: "POST" });
          const cuerpo = await r.json().catch(() => ({}));
          setTrabajando(false);
          if (!r.ok) return setMensaje(cuerpo.error ?? "No fue posible llenar la ficha.");
          setMensaje(cuerpo.campos ? `La IA llenó ${cuerpo.campos} ${cuerpo.campos === 1 ? "dato" : "datos"}.` : "La IA no encontró datos nuevos en el contrato.");
          router.refresh();
        }}
      >
        {trabajando ? "Leyendo el contrato..." : texto}
      </Boton>
    </span>
  );
}

export function SelectorResponsable({ contratoId, actual, opciones }: { contratoId: string; actual: string | null; opciones: { id: string; nombre: string }[] }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="block">
      <select
        aria-label="Abogado responsable"
        className={control}
        value={actual ?? ""}
        disabled={pendiente}
        onChange={(e) =>
          iniciar(async () => {
            const r = await asignarResponsable(contratoId, e.target.value || null);
            setError(r.ok ? "" : r.error);
          })
        }
      >
        <option value="">Sin asignar</option>
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nombre}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-[12px] text-riesgo">{error}</span>}
    </span>
  );
}

export function Terminacion({ contratoId, terminado, hoy }: { contratoId: string; terminado: { fecha: string; motivo: string | null } | null; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(hoy);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const enviar = (f: string | null) =>
    iniciar(async () => {
      const r = await terminarContrato(contratoId, f, motivo);
      if (!r.ok) return setError(r.error);
      setError("");
      setAbierto(false);
    });

  if (terminado) {
    return (
      <Boton variante="fantasma" disabled={pendiente} onClick={() => confirm("¿Revertir la terminación? El contrato vuelve a contar como vigente según sus fechas.") && enviar(null)}>
        Revertir terminación
      </Boton>
    );
  }
  if (!abierto) return <Boton onClick={() => setAbierto(true)}>Dar por terminado</Boton>;
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-linea bg-lienzo p-4">
      <p className="text-[12.5px] text-secundario">Registre la terminación anticipada o por mutuo acuerdo. El contrato deja de contar en la cartera vigente.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
        <Campo etiqueta="Fecha de terminación">
          <input type="date" className={control} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Campo>
        <Campo etiqueta="Motivo">
          <input className={control} value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} placeholder="Por ejemplo: terminación por mutuo acuerdo, convenio del 15 de octubre" />
        </Campo>
      </div>
      {error && <p className="text-[13px] text-riesgo">{error}</p>}
      <div className="flex gap-2">
        <Boton variante="peligro" disabled={pendiente} onClick={() => enviar(fecha)}>
          {pendiente ? "Registrando..." : "Registrar terminación"}
        </Boton>
        <Boton variante="fantasma" disabled={pendiente} onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
      </div>
    </div>
  );
}
