import { exigirUsuario } from "@/lib/auth/sesion";
import { cargarRevision } from "@/lib/revision/cargar";
import { registrarAcceso } from "@/lib/contratos/bitacora";
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
  const pestana: Pestana = PESTANAS.some((x) => x.clave === p) ? (p as Pestana) : "documento";
  const datos = await cargarRevision(id);
  const { contrato, version } = datos;

  if (version && pestana === "documento") {
    await registrarAcceso({ orgId: usuario.org_id, actorId: usuario.id, accion: "ver", versionId: version.id });
  }

  return (
    <div className="flex h-full flex-col">
      <EncabezadoContrato
        contrato={contrato}
        estado={<SelectorEstado contratoId={contrato.id} estado={contrato.estado} editable={permisos.cambiarEstado(usuario.rol)} />}
        acciones={
          <BotonContrapropuesta
            contratoId={contrato.id}
            cambios={datos.hallazgos.filter((x) => x.estado === "aceptado" || x.estado === "editado").length}
            altosPendientes={datos.hallazgos.filter((x) => x.riesgo === "alto" && x.estado === "pendiente").length}
            habilitado={permisos.validar(usuario.rol)}
          />
        }
      />
      <Pestanas base={`/contratos/${id}`} activa={pestana} conteos={{ versiones: datos.versiones.length + datos.contrapropuestas.length, hallazgos: datos.hallazgos.length, comentarios: datos.comentarios.length }} />

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
      {pestana === "versiones" && (
        <div className="space-y-4 px-8 py-6">
          {permisos.validar(usuario.rol) && contrato.estado !== "firmado" && <NuevaVersion contratoId={contrato.id} />}
          <ListaVersiones versiones={datos.versiones} actual={contrato.version_actual_id} perfiles={datos.perfiles} contrapropuestas={datos.contrapropuestas} />
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
