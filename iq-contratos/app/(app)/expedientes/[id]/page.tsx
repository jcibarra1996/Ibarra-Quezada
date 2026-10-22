import Link from "next/link";
import { notFound } from "next/navigation";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { EtiquetaEstado } from "@/components/ui/etiquetas";
import { EtiquetaValidacion } from "@/components/expedientes/etiqueta-validacion";
import { FormularioExpediente } from "@/components/expedientes/formulario-expediente";
import { SubirDocumento } from "@/components/expedientes/subir-documento";
import { BotonValidar } from "@/components/expedientes/boton-validar";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { CAMPO, DOCUMENTOS_REQUERIDOS, TIPOS_DOCUMENTO, type ClaveCampo, type DatosExpediente, type FuentesExpediente, type TipoDocumento, type TipoPersona } from "@/lib/corporativo/campos";
import { fecha, fechaHora } from "@/lib/formato";
import { permisos, type EstadoContrato } from "@/lib/tipos";

interface DatosExtraidos {
  campos?: { clave: ClaveCampo; valor: string }[];
  observaciones?: string[];
  diferencias?: { clave: ClaveCampo; anterior: string; nuevo: string; reemplazado: boolean }[];
}

export default async function PaginaExpediente({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const supabase = await clienteSesion();
  const [{ data: e }, { data: documentos }, { data: contratos }, { data: perfiles }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("corporate_documents")
      .select("id, tipo, nombre_archivo, estado, error, resumen, datos_extraidos, creado_por, creado_en")
      .eq("company_id", id)
      .order("creado_en", { ascending: false }),
    supabase.from("contracts").select("id, titulo, estado, recibido_en").or(`contraparte_id.eq.${id},propia_id.eq.${id}`).order("recibido_en", { ascending: false }),
    supabase.from("profiles").select("id, nombre"),
  ]);
  if (!e) notFound();
  const nombre = (pid: string | null) => perfiles?.find((p) => p.id === pid)?.nombre ?? "Usuario";
  const tipo = e.tipo_persona as TipoPersona;
  const tiene = new Set((documentos ?? []).map((d) => d.tipo));
  const puedeValidar = permisos.validar(usuario.rol);

  return (
    <div>
      <EncabezadoPagina
        titulo={e.denominacion}
        descripcion={`${tipo === "moral" ? "Persona moral" : "Persona física"}${e.es_propia ? " · Empresa propia" : ""}${e.rfc ? ` · RFC ${e.rfc}` : ""}`}
        acciones={
          <>
            <EtiquetaValidacion estado={e.estado} />
            {puedeValidar && <BotonValidar id={e.id} validado={e.estado === "validado"} />}
          </>
        }
      />
      <div className="mx-auto grid max-w-[1280px] grid-cols-[minmax(0,1fr)_400px] gap-6 px-8 py-6">
        <div className="space-y-4">
          {e.estado === "validado" ? (
            <p className="rounded-md border border-linea bg-white px-4 py-2.5 text-[13px] text-secundario">
              Validado por {nombre(e.validado_por)} · {fechaHora(e.validado_en)}. Si alguien fuera de Legal cambia un dato, el expediente regresa a validación.
            </p>
          ) : (
            <p className="rounded-md border border-medio/30 bg-medio-suave px-4 py-2.5 text-[13px] text-medio">
              Datos pendientes de validación por Legal. La IA los extrajo de los documentos; revíselos contra el original antes de usarlos en un contrato.
            </p>
          )}
          <FormularioExpediente
            id={e.id}
            tipo={tipo}
            denominacion={e.denominacion}
            rfc={e.rfc ?? ""}
            datos={e.datos as DatosExpediente}
            fuentes={e.fuentes as FuentesExpediente}
            documentos={Object.fromEntries((documentos ?? []).map((d) => [d.id, d.nombre_archivo]))}
          />
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-linea bg-white p-4">
            <h2 className="mb-3 text-[14px] font-semibold">Documentos del expediente</h2>
            <ul className="mb-4 space-y-1.5">
              {DOCUMENTOS_REQUERIDOS[tipo].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[13px]">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${tiene.has(t) ? "bg-bajo text-white" : "border border-linea-fuerte"}`} aria-hidden>
                    {tiene.has(t) ? "✓" : ""}
                  </span>
                  <span className={tiene.has(t) ? "" : "text-secundario"}>{TIPOS_DOCUMENTO[t]}</span>
                </li>
              ))}
            </ul>
            <SubirDocumento expedienteId={e.id} />
          </section>

          {(documentos ?? []).map((d) => {
            const x = (d.datos_extraidos ?? {}) as DatosExtraidos;
            return (
              <article key={d.id} className="rounded-lg border border-linea bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium">{TIPOS_DOCUMENTO[d.tipo as TipoDocumento]}</p>
                    <p className="truncate text-[12px] text-secundario">
                      {d.nombre_archivo} · {nombre(d.creado_por)} · {fecha(d.creado_en)}
                    </p>
                  </div>
                  <a href={`/api/documentos-corporativos/${d.id}`} className="shrink-0 text-[12px] text-terracota hover:underline">
                    Descargar
                  </a>
                </div>
                {d.estado === "en_proceso" && <p className="mt-2 text-[12.5px] text-secundario">La IA está leyendo el documento...</p>}
                {d.estado === "error" && <p className="mt-2 rounded bg-burgundy-suave px-2 py-1.5 text-[12.5px] text-burgundy">{d.error}</p>}
                {d.estado === "completado" && (
                  <>
                    {d.resumen && <p className="mt-2 text-[12.5px] leading-relaxed">{d.resumen}</p>}
                    <p className="mt-1.5 text-[12px] text-secundario">{x.campos?.length ?? 0} datos extraídos.</p>
                    {(x.diferencias ?? []).length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {x.diferencias!.map((df) => (
                          <li key={df.clave} className="rounded bg-medio-suave px-2 py-1.5 text-[12px] text-medio">
                            {CAMPO[df.clave]?.etiqueta}: el documento dice «{df.nuevo}»; el expediente tenía «{df.anterior}».{" "}
                            {df.reemplazado ? "Se actualizó con este documento." : "Se conservó el dato anterior."}
                          </li>
                        ))}
                      </ul>
                    )}
                    {(x.observaciones ?? []).length > 0 && (
                      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[12px] text-secundario">
                        {x.observaciones!.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </article>
            );
          })}

          <section className="rounded-lg border border-linea bg-white p-4">
            <h2 className="mb-2 text-[14px] font-semibold">Contratos con esta parte</h2>
            {(contratos ?? []).length === 0 ? (
              <p className="text-[12.5px] text-secundario">Ningún contrato vinculado.</p>
            ) : (
              <ul className="space-y-2">
                {contratos!.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <Link href={`/contratos/${c.id}?pestana=partes`} className="truncate text-[13px] hover:text-terracota">
                      {c.titulo}
                    </Link>
                    <EtiquetaEstado estado={c.estado as EstadoContrato} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
