import Link from "next/link";
import { redirect } from "next/navigation";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { fecha } from "@/lib/formato";
import { permisos, TIPOS_CONTRATO, type TipoContrato } from "@/lib/tipos";
import type { CampoNegocio, RolPlantilla } from "@/lib/plantillas/llenar";

export const metadata = { title: "Plantillas" };

export default async function PaginaPlantillas() {
  const usuario = await exigirUsuario();
  if (!permisos.verBiblioteca(usuario.rol)) redirect("/inicio");
  const supabase = await clienteSesion();
  const { data: plantillas } = await supabase
    .from("templates")
    .select("id, nombre, descripcion, tipo_contrato, version, actualizado_en, roles, campos")
    .eq("activa", true)
    .order("nombre");

  return (
    <div>
      <EncabezadoPagina
        titulo="Plantillas"
        descripcion="Contratos base de la dirección legal. Se llenan solos con los expedientes corporativos de las partes y los datos del negocio; el resultado entra a revisión de Legal."
      />
      <div className="grid grid-cols-3 gap-4 px-8 py-6">
        {(plantillas ?? []).map((p) => {
          const roles = p.roles as RolPlantilla[];
          return (
            <Link key={p.id} href={`/plantillas/${p.id}`} className="flex flex-col rounded-lg border border-linea bg-white p-5 hover:border-linea-fuerte">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-terracota-oscuro">{TIPOS_CONTRATO[p.tipo_contrato as TipoContrato]}</p>
              <h2 className="mt-1 titulo text-[18px]">{p.nombre}</h2>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-secundario">{p.descripcion}</p>
              <p className="mt-4 text-[12px] text-secundario">
                {roles.map((r) => r.termino).join(" y ")} · {(p.campos as CampoNegocio[]).length} datos del negocio · versión {p.version}, {fecha(p.actualizado_en)}
              </p>
              <span className="mt-3 text-[13px] font-medium text-terracota">Usar plantilla</span>
            </Link>
          );
        })}
        {(plantillas ?? []).length === 0 && <p className="col-span-3 text-[13.5px] text-secundario">Aún no hay plantillas configuradas.</p>}
      </div>
    </div>
  );
}
