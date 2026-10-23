import { after } from "next/server";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { cargarRevision } from "@/lib/revision/cargar";
import { encabezadosAcceso, registrarAcceso } from "@/lib/contratos/bitacora";
import { PanelPartes, type ExpedienteParte } from "@/components/revision/panel-partes";
import { PanelSolicitud } from "@/components/revision/panel-solicitud";
import { FirmaElectronica } from "@/components/firmas/firma-electronica";
import { credencialesMifiel } from "@/lib/firmas/mifiel";
import type { EstadoContrato } from "@/lib/tipos";
import { EncabezadoContrato } from "@/components/revision/encabezado-contrato";
import { Pestanas, PESTANAS, type Pestana } from "@/components/revision/pestanas";
import { EspacioRevision } from "@/components/revision/espacio-revision";
import { ListaHallazgos } from "@/components/revision/lista-hallazgos";
import { SelectorEstado } from "@/components/revision/selector-estado";
import { permisos } from "@/lib/tipos";
import { ListaVersiones } from "@/components/revision/versiones";
import { Historial } from "@/components/revision/historial";
import { Comentarios } from "@/components/revision/comentarios";
import { NuevaVersion } from "@/components/revision/nueva-version";
import { BotonContrapropuesta } from "@/components/revision/boton-contrapropuesta";

export default async function PaginaRevision({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pestana?: string; h?: string }>;
}) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const { pestana: p, h } = await searchParams;
  // El análisis de la IA es trabajo interno de Legal: Negocio no ve la pestaña de hallazgos.
  const legal = permisos.validar(usuario.rol);
  const pestana: Pestana = PESTANAS.some((x) => x.clave === p) && (legal || p !== "hallazgos") ? (p as Pestana) : "documento";
  const datos = await cargarRevision(id);
  const { contrato, version } = datos;

  if (version && pestana === "documento") {
    // La bitácora se escribe después de enviar la página, sin retrasarla.
    const encabezados = await encabezadosAcceso();
    after(() => registrarAcceso({ orgId: usuario.org_id, actorId: usuario.id, accion: "ver", versionId: version.id, encabezados }));
  }
  const partes = pestana === "partes" ? await cargarPartes(contrato.propia_id, contrato.contraparte_id) : null;
  const puedeVincular =
    contrato.estado !== "firmado" && (permisos.validar(usuario.rol) || contrato.creado_por === usuario.id || contrato.solicitado_por === usuario.id);

  return (
    <div className="flex h-full flex-col">
      <EncabezadoContrato
        contrato={contrato}
        estado={<SelectorEstado contratoId={contrato.id} estado={contrato.estado} editable={permisos.cambiarEstado(usuario.rol)} />}
        acciones={
          legal ? (
            <>
              {(contrato.estado !== "firmado" || datos.firmas.length > 0) && (
                <FirmaElectronica
                  contratoId={contrato.id}
                  estado={contrato.estado as EstadoContrato}
                  solicitudes={datos.firmas}
                  configurado={(await credencialesMifiel(usuario.org_id)) !== null}
                  versionEsPdf={version?.mime === "application/pdf"}
                  sugeridos={await firmantesSugeridos(contrato.propia_id, contrato.contraparte_id)}
                />
              )}
              <BotonContrapropuesta
                contratoId={contrato.id}
                cambios={datos.hallazgos.filter((x) => x.estado === "aceptado" || x.estado === "editado").length}
                altosPendientes={datos.hallazgos.filter((x) => x.riesgo === "alto" && x.estado === "pendiente").length}
                estado={contrato.estado}
                habilitado
              />
            </>
          ) : undefined
        }
      />
      <Pestanas base={`/contratos/${id}`} activa={pestana} ocultar={legal ? [] : ["hallazgos"]} conteos={{ partes: [contrato.propia_id, contrato.contraparte_id].filter(Boolean).length, versiones: datos.versiones.length + datos.contrapropuestas.length, hallazgos: datos.hallazgos.length, comentarios: datos.comentarios.length }} />

      {pestana === "documento" && (
        version ? (
          <EspacioRevision
            contratoId={contrato.id}
            secciones={datos.secciones}
            paginas={version.paginas}
            paginasVirtuales={version.paginas_virtuales}
            analisis={datos.analisis}
            hallazgos={datos.hallazgos}
            puedeValidar={permisos.validar(usuario.rol)}
            perfiles={datos.perfiles}
            inicial={h ?? null}
            cerrado={contrato.estado === "aprobado" || contrato.estado === "firmado"}
            panel={
              legal ? undefined : (
                <PanelSolicitud
                  contratoId={contrato.id}
                  estado={contrato.estado as EstadoContrato}
                  recibido={contrato.recibido_en}
                  firmaEnCurso={datos.firmas.some((f) => f.estado === "enviado")}
                  comentariosLegal={datos.comentarios.filter((c) => c.audiencia === "negocio" && c.autor_id !== usuario.id).length}
                />
              )
            }
          />
        ) : (
          <p className="p-8 text-secundario">Este contrato no tiene documento cargado.</p>
        )
      )}
      {pestana === "hallazgos" && (
        <div className="px-8 py-6">
          <ListaHallazgos contratoId={contrato.id} hallazgos={datos.hallazgos} perfiles={datos.perfiles} />
        </div>
      )}
      {pestana === "partes" && partes && (
        <div className="px-8 py-6">
          <PanelPartes
            contratoId={contrato.id}
            contraparteNombre={contrato.contraparte}
            propia={partes.propia}
            contraparte={partes.contraparte}
            opciones={partes.opciones}
            editable={puedeVincular}
            hallazgosCorporativos={legal ? datos.hallazgos.filter((x) => x.tipo === "dato_corporativo").length : null}
          />
        </div>
      )}
      {pestana === "versiones" && (
        <div className="space-y-4 px-8 py-6">
          {permisos.validar(usuario.rol) && contrato.estado !== "firmado" && <NuevaVersion contratoId={contrato.id} />}
          <ListaVersiones versiones={datos.versiones} actual={contrato.version_actual_id} perfiles={datos.perfiles} contrapropuestas={datos.contrapropuestas} estado={contrato.estado} />
        </div>
      )}
      {pestana === "historial" && (
        <div className="max-w-3xl px-8 py-6">
          <Historial eventos={datos.historial} perfiles={datos.perfiles} />
        </div>
      )}
      {pestana === "comentarios" && (
        <div className="px-8 py-6">
          <Comentarios contratoId={contrato.id} comentarios={datos.comentarios} perfiles={datos.perfiles} hallazgos={datos.hallazgos} />
        </div>
      )}
    </div>
  );
}

async function cargarPartes(propiaId: string | null, contraparteId: string | null) {
  const supabase = await clienteSesion();
  const ids = [propiaId, contraparteId].filter(Boolean) as string[];
  const [{ data: opciones }, { data: filas }] = await Promise.all([
    supabase.from("companies").select("id, denominacion, es_propia").order("denominacion"),
    ids.length
      ? supabase.from("companies").select("id, denominacion, rfc, tipo_persona, estado, datos, corporate_documents(tipo)").in("id", ids)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const aParte = (id: string | null): ExpedienteParte | null => {
    const f = filas?.find((x) => x.id === id);
    if (!f) return null;
    return { ...f, documentos: (f.corporate_documents ?? []).map((d: { tipo: string }) => d.tipo) };
  };
  return { opciones: opciones ?? [], propia: aParte(propiaId), contraparte: aParte(contraparteId) };
}

// Representantes de cada parte según su expediente, para proponerlos como firmantes.
async function firmantesSugeridos(propiaId: string | null, contraparteId: string | null) {
  const ids = [propiaId, contraparteId].filter(Boolean) as string[];
  if (!ids.length) return [];
  const supabase = await clienteSesion();
  const { data } = await supabase.from("companies").select("id, denominacion, tipo_persona, datos").in("id", ids);
  return (data ?? []).map((e) => {
    const d = (e.datos ?? {}) as { representante_nombre?: string; correo_notificaciones?: string };
    return {
      nombre: e.tipo_persona === "fisica" ? e.denominacion : (d.representante_nombre ?? ""),
      correo: d.correo_notificaciones ?? "",
      rfc: "",
      parte: e.denominacion,
      interno: e.id === propiaId,
    };
  });
}
