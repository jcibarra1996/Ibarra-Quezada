import Link from "next/link";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { EtiquetaEstado } from "@/components/ui/etiquetas";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { fecha } from "@/lib/formato";
import type { EstadoContrato } from "@/lib/tipos";

export const metadata = { title: "Inicio" };

export default async function Inicio() {
  const usuario = await exigirUsuario();
  const supabase = await clienteSesion();
  const { data: recientes } = await supabase
    .from("contracts")
    .select("id, titulo, contraparte, estado, recibido_en")
    .order("recibido_en", { ascending: false })
    .limit(8);
  return (
    <div>
      <EncabezadoPagina titulo={`Buen día, ${usuario.nombre.split(" ")[0]}`} descripcion="La IA hace la primera lectura. Su equipo decide." />
      <div className="px-8 py-6">
        <h2 className="mb-3 text-[14px] font-semibold">Contratos recientes</h2>
        <ul className="divide-y divide-linea overflow-hidden rounded-lg border border-linea bg-white">
          {(recientes ?? []).map((c) => (
            <li key={c.id}>
              <Link href={`/contratos/${c.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-lienzo">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium">{c.titulo}</span>
                  <span className="block truncate text-[12.5px] text-secundario">{c.contraparte || "Contraparte sin identificar"} · recibido {fecha(c.recibido_en)}</span>
                </span>
                <EtiquetaEstado estado={c.estado as EstadoContrato} />
              </Link>
            </li>
          ))}
          {(recientes ?? []).length === 0 && <li className="px-4 py-10 text-center text-[13.5px] text-secundario">Aún no hay contratos. Use "Subir contrato" para empezar.</li>}
        </ul>
      </div>
    </div>
  );
}
