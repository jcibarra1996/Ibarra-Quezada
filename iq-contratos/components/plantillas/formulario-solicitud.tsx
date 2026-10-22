"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { EtiquetaValidacion } from "@/components/expedientes/etiqueta-validacion";
import { NuevoExpediente } from "@/components/expedientes/nuevo-expediente";
import { llenarPlantilla, type CampoNegocio, type RolPlantilla } from "@/lib/plantillas/llenar";
import type { DatosExpediente, TipoPersona } from "@/lib/corporativo/campos";

interface ExpedienteOpcion {
  id: string;
  denominacion: string;
  rfc: string | null;
  tipo_persona: string;
  datos: unknown;
  es_propia: boolean;
  estado: string;
}

const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

export function FormularioSolicitud({
  plantilla,
  expedientes,
  areas,
}: {
  plantilla: { id: string; cuerpo: string; roles: RolPlantilla[]; campos: CampoNegocio[] };
  expedientes: ExpedienteOpcion[];
  areas: { id: string; nombre: string }[];
}) {
  const propias = expedientes.filter((e) => e.es_propia);
  const terceros = expedientes.filter((e) => !e.es_propia);
  const [contraparteId, setContraparteId] = useState("");
  const [propiaId, setPropiaId] = useState(propias[0]?.id ?? "");
  const [negocio, setNegocio] = useState<Record<string, string>>(() => Object.fromEntries(plantilla.campos.map((c) => [c.clave, c.predeterminado ?? ""])));
  const [lugar, setLugar] = useState("la Ciudad de México");
  const [fechaFirma, setFechaFirma] = useState("");
  const [areaId, setAreaId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const contraparte = terceros.find((e) => e.id === contraparteId) ?? null;
  const propia = propias.find((e) => e.id === propiaId) ?? null;
  const parte = (e: ExpedienteOpcion | null) =>
    e ? { denominacion: e.denominacion, rfc: e.rfc, tipo_persona: e.tipo_persona as TipoPersona, datos: e.datos as DatosExpediente } : null;

  const llenado = useMemo(
    () =>
      llenarPlantilla({
        cuerpo: plantilla.cuerpo,
        roles: plantilla.roles,
        campos: plantilla.campos,
        partes: Object.fromEntries(plantilla.roles.map((r) => [r.clave, r.propia ? parte(propia) : parte(contraparte)])),
        negocio,
        lugarFirma: lugar,
        fechaFirma: fechaFirma || null,
      }),
    [plantilla, propia, contraparte, negocio, lugar, fechaFirma],
  );
  const requeridosVacios = plantilla.campos.filter((c) => c.requerido && !negocio[c.clave]?.trim());
  const rolTercero = plantilla.roles.find((r) => !r.propia);

  async function generar() {
    setEnviando(true);
    setError("");
    const r = await fetch(`/api/plantillas/${plantilla.id}/generar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contraparte_id: contraparteId, propia_id: propiaId, negocio, lugar_firma: lugar, fecha_firma: fechaFirma, area_id: areaId }),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      setEnviando(false);
      return setError(cuerpo.error ?? "No fue posible generar el contrato.");
    }
    router.push(`/contratos/${cuerpo.id}`);
  }

  const control = "w-full rounded-md border border-linea-fuerte bg-white px-2.5 text-[13px] outline-none focus:border-terracota";
  return (
    <div className="flex min-h-0 flex-1">
      <div className="w-[440px] shrink-0 space-y-5 overflow-auto border-r border-linea bg-white px-6 py-5">
        <section>
          <h2 className="mb-2 text-[13px] font-semibold">Partes</h2>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-secundario">{rolTercero?.etiqueta ?? "Contraparte"}</span>
            <select value={contraparteId} onChange={(e) => setContraparteId(e.target.value)} className={`${control} h-9`}>
              <option value="">Seleccione el expediente</option>
              {terceros.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.denominacion}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2 flex items-center justify-between gap-2">
            {contraparte ? (
              <span className="flex items-center gap-2 text-[12px]">
                <EtiquetaValidacion estado={contraparte.estado} />
                <Link href={`/expedientes/${contraparte.id}`} className="text-terracota hover:underline" target="_blank">
                  Ver expediente y documentos
                </Link>
              </span>
            ) : (
              <span className="text-[12px] text-secundario">¿Es una contraparte nueva? Cree su expediente y cargue sus documentos.</span>
            )}
            <NuevoExpediente
              texto="Nuevo"
              variante="secundario"
              alCrear={(id) => {
                router.refresh();
                setContraparteId(id);
              }}
            />
          </div>
          {propias.length > 1 && (
            <label className="mt-3 block">
              <span className="mb-1 block text-[12px] font-medium text-secundario">Empresa que firma</span>
              <select value={propiaId} onChange={(e) => setPropiaId(e.target.value)} className={`${control} h-9`}>
                {propias.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.denominacion}
                  </option>
                ))}
              </select>
            </label>
          )}
          {propias.length === 0 && <p className="mt-2 text-[12px] text-medio">No hay expediente de la empresa propia; las declaraciones de la empresa quedarán pendientes.</p>}
        </section>

        <section>
          <h2 className="mb-2 text-[13px] font-semibold">Datos del negocio</h2>
          <div className="space-y-3">
            {plantilla.campos.map((c) => (
              <label key={c.clave} className="block">
                <span className="mb-1 block text-[12px] font-medium text-secundario">
                  {c.etiqueta}
                  {c.unidad ? ` (${c.unidad[1]})` : ""}
                  {c.requerido ? " *" : ""}
                </span>
                {c.tipo === "largo" ? (
                  <textarea rows={3} value={negocio[c.clave] ?? ""} onChange={(e) => setNegocio({ ...negocio, [c.clave]: e.target.value })} className={`${control} py-2`} />
                ) : (
                  <input
                    type={c.tipo === "fecha" ? "date" : "text"}
                    inputMode={c.tipo === "importe" || c.tipo === "entero" ? "decimal" : undefined}
                    value={negocio[c.clave] ?? ""}
                    onChange={(e) => setNegocio({ ...negocio, [c.clave]: e.target.value })}
                    className={`${control} h-9`}
                    placeholder={c.tipo === "importe" ? "180000.00" : undefined}
                  />
                )}
                {c.ayuda && <span className="mt-0.5 block text-[11.5px] text-secundario">{c.ayuda}</span>}
              </label>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-secundario">Lugar de firma</span>
            <input value={lugar} onChange={(e) => setLugar(e.target.value)} className={`${control} h-9`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-secundario">Fecha de firma</span>
            <input type="date" min={hoy()} value={fechaFirma} onChange={(e) => setFechaFirma(e.target.value)} className={`${control} h-9`} />
          </label>
          <label className="col-span-2 block">
            <span className="mb-1 block text-[12px] font-medium text-secundario">Área que solicita</span>
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className={`${control} h-9`}>
              <option value="">Sin asignar</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </label>
        </section>

        <div className="space-y-2 border-t border-linea pt-4">
          {llenado.faltantes.length > 0 && (
            <p className="rounded-md bg-medio-suave px-3 py-2 text-[12.5px] text-medio">
              {llenado.faltantes.length} {llenado.faltantes.length === 1 ? "dato pendiente queda marcado" : "datos pendientes quedan marcados"} en el contrato. Puede generarlo de
              todas formas; Legal los verá resaltados.
            </p>
          )}
          {error && <p className="text-[13px] text-burgundy">{error}</p>}
          <Boton variante="primario" className="h-9 w-full" disabled={!contraparte || requeridosVacios.length > 0 || enviando} onClick={generar}>
            {enviando ? "Generando el contrato..." : "Generar contrato y enviar a revisión"}
          </Boton>
          {(!contraparte || requeridosVacios.length > 0) && (
            <p className="text-[11.5px] text-secundario">
              {!contraparte ? "Seleccione la contraparte. " : ""}
              {requeridosVacios.length ? `Faltan: ${requeridosVacios.map((c) => c.etiqueta.charAt(0).toLowerCase() + c.etiqueta.slice(1)).join(", ")}.` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-auto bg-lienzo px-8 py-6">
        <p className="mb-3 text-[12px] text-secundario">Vista previa. Los datos de las partes salen de sus expedientes corporativos.</p>
        <article className="texto-contrato mx-auto max-w-[760px] whitespace-pre-wrap rounded-lg border border-linea bg-white px-12 py-10">
          {llenado.texto.split(/(\[PENDIENTE: [^\]]+\])/).map((t, i) =>
            t.startsWith("[PENDIENTE:") ? (
              <mark key={i} className="rounded bg-medio-suave px-0.5 font-sans text-[12.5px] font-medium text-medio">
                {t}
              </mark>
            ) : (
              <span key={i}>{t}</span>
            ),
          )}
        </article>
      </div>
    </div>
  );
}
