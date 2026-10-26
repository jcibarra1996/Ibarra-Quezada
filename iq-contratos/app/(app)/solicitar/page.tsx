import Link from "next/link";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { SubirContrato } from "@/components/app/subir-contrato";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";

export const metadata = { title: "Solicitar nuevo contrato" };

export default async function Solicitar() {
  await exigirUsuario();
  const supabase = await clienteSesion();
  const { data: areas } = await supabase.from("areas").select("id, nombre").order("nombre");

  return (
    <div>
      <EncabezadoPagina titulo="Solicitar nuevo contrato" descripcion="Legal recibe su solicitud, la revisa y le avisa en qué va." />
      <div className="mx-auto max-w-[1100px] space-y-8 px-8 py-7">
        <section className="flex items-center justify-between gap-6 rounded-lg border border-linea bg-white p-5">
          <div>
            <h2 className="titulo text-[18px]">Suba el contrato que le envió la contraparte</h2>
            <p className="mt-1 text-[13px] text-secundario">En PDF o Word. Legal hace la revisión y le avisa si hay que negociar algo.</p>
          </div>
          <div className="w-56 shrink-0">
            <SubirContrato areas={areas ?? []} texto="Subir su contrato" />
          </div>
        </section>

        <section className="rounded-lg bg-mandarina-suave px-5 py-4">
          <h2 className="text-[14px] font-semibold">Para avanzar más rápido, tenga a la mano de la contraparte</h2>
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
            <li>Acta constitutiva</li>
            <li>Poder de su representante legal</li>
            <li>Constancia de situación fiscal</li>
            <li>Identificación oficial del representante</li>
            <li>Comprobante de domicilio</li>
          </ul>
          <p className="mt-2 text-[12.5px] text-secundario">
            Cárguelos en <Link href="/expedientes" className="font-medium text-mandarina-texto hover:underline">Expedientes corporativos</Link>. Legal usa esos datos para revisar las declaraciones del
            contrato.
          </p>
        </section>
      </div>
    </div>
  );
}
