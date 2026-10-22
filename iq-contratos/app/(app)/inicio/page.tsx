import Link from "next/link";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { EtiquetaEstado } from "@/components/ui/etiquetas";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { fecha } from "@/lib/formato";
import { hallazgosVigentes } from "@/lib/reportes/consultas";
import type { EstadoContrato } from "@/lib/tipos";

export const metadata = { title: "Inicio" };

export default async function Inicio() {
  const usuario = await exigirUsuario();
  const supabase = await clienteSesion();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const en30 = new Date(Date.parse(`${hoy}T12:00:00Z`) + 30 * 864e5).toISOString().slice(0, 10);
  const [{ data: recientes }, hallazgos, { count: vencimientos }, { count: enRevision }] = await Promise.all([
    supabase.from("contracts").select("id, titulo, contraparte, estado, recibido_en").order("recibido_en", { ascending: false }).limit(8),
    hallazgosVigentes(supabase),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("estado", "activa").gte("fecha_limite", hoy).lte("fecha_limite", en30),
    supabase.from("contracts").select("id", { count: "exact", head: true }).in("estado", ["recibido", "en_revision"]),
  ]);
  const pendientes = hallazgos.filter((h) => h.estado === "pendiente");
  const altos = pendientes.filter((h) => h.riesgo === "alto");
  const Tile = ({ titulo, valor, href, nota }: { titulo: string; valor: number; href: string; nota: string }) => (
    <Link href={href} className="rounded-lg border border-linea bg-white px-5 py-4 hover:border-linea-fuerte">
      <p className="text-[12.5px] text-secundario">{titulo}</p>
      <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums">{valor}</p>
      <p className="mt-2 text-[12px] text-secundario">{nota}</p>
    </Link>
  );
  return (
    <div>
      <EncabezadoPagina titulo={`Buen día, ${usuario.nombre.split(" ")[0]}`} descripcion="La IA hace la primera lectura. Su equipo decide." />
      <div className="px-8 py-6">
        <section className="mb-6 grid grid-cols-3 gap-4">
          <Tile titulo="Hallazgos de riesgo alto por validar" valor={altos.length} href="/contratos?riesgo=alto" nota={`${pendientes.length} hallazgos pendientes en total`} />
          <Tile titulo="Vencimientos en los próximos 30 días" valor={vencimientos ?? 0} href="/vencimientos" nota="Plazos de aviso y fines de vigencia" />
          <Tile titulo="Contratos por revisar" valor={enRevision ?? 0} href="/contratos" nota="Recibidos o en revisión" />
        </section>
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
