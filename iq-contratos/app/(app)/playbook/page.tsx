import Link from "next/link";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { AgregarPosicion, Posicion } from "@/components/playbook/posicion";
import { CrearPlaybook } from "@/components/playbook/crear-playbook";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { fechaHora } from "@/lib/formato";
import { permisos, TIPOS_CONTRATO, type TipoContrato } from "@/lib/tipos";

export const metadata = { title: "Plantillas y playbook" };

export default async function Playbook({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const usuario = await exigirUsuario();
  const { tipo } = await searchParams;
  const supabase = await clienteSesion();
  const [{ data: playbooks }, { data: perfiles }] = await Promise.all([
    supabase
      .from("playbooks")
      .select("id, tipo_contrato, nombre, actualizado_en, actualizado_por, playbook_positions(id, tema, preferida, respaldo, nunca_se_acepta, clausula_modelo, orden)")
      .order("tipo_contrato"),
    supabase.from("profiles").select("id, nombre"),
  ]);
  const lista = playbooks ?? [];
  const actual = lista.find((p) => p.tipo_contrato === tipo) ?? lista[0];
  const editable = permisos.editarPlaybook(usuario.rol);
  const disponibles = (Object.keys(TIPOS_CONTRATO) as TipoContrato[]).filter((t) => !lista.some((p) => p.tipo_contrato === t));
  const autor = perfiles?.find((p) => p.id === actual?.actualizado_por)?.nombre;

  return (
    <div>
      <EncabezadoPagina
        titulo="Plantillas y playbook"
        descripcion="Posiciones estándar de la dirección legal por tipo de contrato. La IA compara cada cláusula contra estas posiciones y propone redacción con base en la cláusula modelo."
        acciones={editable ? <CrearPlaybook disponibles={disponibles} /> : undefined}
      />
      <nav className="flex gap-1 border-b border-linea bg-white px-8" aria-label="Tipos de contrato">
        {lista.map((p) => (
          <Link
            key={p.id}
            href={`/playbook?tipo=${p.tipo_contrato}`}
            className={`-mb-px flex h-10 items-center border-b-2 px-3 text-[13.5px] ${
              actual?.id === p.id ? "border-terracota font-medium" : "border-transparent text-secundario hover:text-tinta"
            }`}
          >
            {TIPOS_CONTRATO[p.tipo_contrato as TipoContrato]}
            <span className="ml-1.5 rounded bg-gris-100 px-1.5 text-[11px] text-secundario">{p.playbook_positions?.length ?? 0}</span>
          </Link>
        ))}
      </nav>
      <div className="mx-auto max-w-[1100px] space-y-4 px-8 py-6">
        {!editable && (
          <p className="rounded-md border border-linea bg-white px-4 py-2.5 text-[13px] text-secundario">Solo la dirección jurídica puede modificar el playbook.</p>
        )}
        {actual ? (
          <>
            <p className="text-[12.5px] text-secundario">
              Última actualización: {fechaHora(actual.actualizado_en)}
              {autor ? ` por ${autor}` : ""}.
            </p>
            {[...(actual.playbook_positions ?? [])]
              .sort((a, b) => a.orden - b.orden)
              .map((pos) => (
                <Posicion key={pos.id} playbookId={actual.id} posicion={pos} editable={editable} />
              ))}
            {editable && <AgregarPosicion playbookId={actual.id} />}
          </>
        ) : (
          <p className="text-[13.5px] text-secundario">Aún no hay playbooks configurados.</p>
        )}
      </div>
    </div>
  );
}
