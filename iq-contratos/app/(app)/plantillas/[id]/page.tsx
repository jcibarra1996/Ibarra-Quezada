import { notFound } from "next/navigation";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { FormularioSolicitud } from "@/components/plantillas/formulario-solicitud";
import { EditorPlantilla } from "@/components/plantillas/editor-plantilla";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { permisos, TIPOS_CONTRATO, type TipoContrato } from "@/lib/tipos";
import type { CampoNegocio, RolPlantilla } from "@/lib/plantillas/llenar";

export default async function PaginaPlantilla({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ editar?: string }> }) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const { editar } = await searchParams;
  const supabase = await clienteSesion();
  const [{ data: plantilla }, { data: expedientes }, { data: areas }] = await Promise.all([
    supabase.from("templates").select("id, nombre, descripcion, tipo_contrato, cuerpo, roles, campos, version").eq("id", id).maybeSingle(),
    supabase.from("companies").select("id, denominacion, rfc, tipo_persona, datos, es_propia, estado").order("denominacion"),
    supabase.from("areas").select("id, nombre").order("nombre"),
  ]);
  if (!plantilla) notFound();
  const director = permisos.editarPlaybook(usuario.rol);

  return (
    <div className="flex h-full flex-col">
      <EncabezadoPagina
        titulo={plantilla.nombre}
        descripcion={`${TIPOS_CONTRATO[plantilla.tipo_contrato as TipoContrato]} · versión ${plantilla.version}. ${plantilla.descripcion}`}
        acciones={
          director ? (
            <a href={editar ? `/plantillas/${id}` : `/plantillas/${id}?editar=1`} className="text-[13px] font-medium text-terracota hover:underline">
              {editar ? "Usar la plantilla" : "Editar plantilla"}
            </a>
          ) : undefined
        }
      />
      {director && editar ? (
        <EditorPlantilla id={plantilla.id} nombre={plantilla.nombre} descripcion={plantilla.descripcion} cuerpo={plantilla.cuerpo} campos={plantilla.campos as CampoNegocio[]} roles={plantilla.roles as RolPlantilla[]} />
      ) : (
        <FormularioSolicitud
          plantilla={{ id: plantilla.id, cuerpo: plantilla.cuerpo, roles: plantilla.roles as RolPlantilla[], campos: plantilla.campos as CampoNegocio[] }}
          expedientes={expedientes ?? []}
          areas={areas ?? []}
        />
      )}
    </div>
  );
}
