import { exigirUsuario } from "@/lib/auth/sesion";
import { cargarRevision } from "@/lib/revision/cargar";
import { registrarAcceso } from "@/lib/contratos/bitacora";
import { EncabezadoContrato } from "@/components/revision/encabezado-contrato";
import { Pestanas, PESTANAS, type Pestana } from "@/components/revision/pestanas";
import { VisorContrato } from "@/components/revision/visor";
import { ListaVersiones } from "@/components/revision/versiones";
import { Historial } from "@/components/revision/historial";
import { Boton } from "@/components/ui/boton";

export default async function PaginaRevision({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pestana?: string }>;
}) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const { pestana: p } = await searchParams;
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
        acciones={
          <Boton variante="primario" disabled title="Disponible al validar hallazgos">
            Enviar contrapropuesta
          </Boton>
        }
      />
      <Pestanas base={`/contratos/${id}`} activa={pestana} conteos={{ versiones: datos.versiones.length }} />

      {pestana === "documento" && (
        <div className="flex min-h-0 flex-1">
          {version ? (
            <VisorContrato secciones={datos.secciones} paginas={version.paginas} paginasVirtuales={version.paginas_virtuales} />
          ) : (
            <p className="p-8 text-secundario">Este contrato no tiene documento cargado.</p>
          )}
          <aside className="w-[400px] shrink-0 border-l border-linea bg-white p-5">
            <h2 className="text-[15px] font-semibold">Análisis IA</h2>
            <p className="mt-2 text-[13px] text-secundario">El análisis contra el playbook se habilita en la siguiente etapa.</p>
          </aside>
        </div>
      )}
      {pestana === "versiones" && (
        <div className="px-8 py-6">
          <ListaVersiones versiones={datos.versiones} actual={contrato.version_actual_id} perfiles={datos.perfiles} />
        </div>
      )}
      {pestana === "historial" && (
        <div className="max-w-3xl px-8 py-6">
          <Historial eventos={datos.historial} perfiles={datos.perfiles} />
        </div>
      )}
      {(pestana === "hallazgos" || pestana === "comentarios") && (
        <p className="px-8 py-6 text-[13.5px] text-secundario">Esta sección se habilita en la siguiente etapa.</p>
      )}
    </div>
  );
}
