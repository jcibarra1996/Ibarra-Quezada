import Link from "next/link";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { SubirContrato } from "@/components/app/subir-contrato";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { TIPOS_CONTRATO, type TipoContrato } from "@/lib/tipos";

export const metadata = { title: "Solicitar nuevo contrato" };

export default async function Solicitar() {
  await exigirUsuario();
  const supabase = await clienteSesion();
  const [{ data: plantillas }, { data: areas }] = await Promise.all([
    supabase.from("templates").select("id, nombre, descripcion, tipo_contrato").eq("activa", true).order("nombre"),
    supabase.from("areas").select("id, nombre").order("nombre"),
  ]);

  return (
    <div>
      <EncabezadoPagina titulo="Solicitar nuevo contrato" descripcion="Elija cómo empezar. En ambos casos Legal recibe su solicitud, la revisa y le avisa en qué va." />
      <div className="mx-auto max-w-[1100px] space-y-8 px-8 py-7">
        <section>
          <div className="mb-3 flex items-baseline gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-terracota text-[13px] font-semibold text-white">1</span>
            <div>
              <h2 className="text-[16px] font-semibold">Usar una plantilla de la empresa</h2>
              <p className="text-[13px] text-secundario">El contrato se llena solo con los datos de la contraparte y los del negocio. Es la opción más rápida.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(plantillas ?? []).map((p) => (
              <Link key={p.id} href={`/plantillas/${p.id}`} className="group rounded-lg border border-linea bg-white p-4 transition-colors hover:border-terracota">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-terracota-oscuro">{TIPOS_CONTRATO[p.tipo_contrato as TipoContrato]}</p>
                <p className="mt-1 text-[14.5px] font-semibold">{p.nombre}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-secundario">{p.descripcion}</p>
                <p className="mt-3 text-[13px] font-medium text-terracota group-hover:underline">Empezar</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-between gap-6 rounded-lg border border-linea bg-white p-5">
          <div className="flex items-baseline gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tinta text-[13px] font-semibold text-white">2</span>
            <div>
              <h2 className="text-[16px] font-semibold">La contraparte me envió su contrato</h2>
              <p className="text-[13px] text-secundario">Súbalo en PDF o Word. Legal hace la revisión y le avisa si hay que negociar algo.</p>
            </div>
          </div>
          <div className="w-56 shrink-0">
            <SubirContrato areas={areas ?? []} texto="Subir su contrato" />
          </div>
        </section>

        <section className="rounded-lg bg-crema px-5 py-4">
          <h2 className="text-[14px] font-semibold">Para avanzar más rápido, tenga a la mano de la contraparte</h2>
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
            <li>Acta constitutiva</li>
            <li>Poder de su representante legal</li>
            <li>Constancia de situación fiscal</li>
            <li>Identificación oficial del representante</li>
            <li>Comprobante de domicilio</li>
          </ul>
          <p className="mt-2 text-[12.5px] text-secundario">
            Cárguelos en <Link href="/expedientes" className="font-medium text-terracota hover:underline">Expedientes corporativos</Link>. Legal usa esos datos para revisar las declaraciones del
            contrato.
          </p>
        </section>
      </div>
    </div>
  );
}
