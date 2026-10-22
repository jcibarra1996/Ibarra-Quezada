import Link from "next/link";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { RegistrarFirma } from "@/components/firmas/registrar-firma";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { fecha } from "@/lib/formato";
import { permisos } from "@/lib/tipos";

export const metadata = { title: "Firmas" };

export default async function Firmas() {
  const usuario = await exigirUsuario();
  const supabase = await clienteSesion();
  const { data } = await supabase
    .from("contracts")
    .select("id, titulo, contraparte, estado, aprobado_en, firmado_en")
    .in("estado", ["aprobado", "firmado"])
    .order("aprobado_en", { ascending: false });
  const pendientes = (data ?? []).filter((c) => c.estado === "aprobado");
  const firmados = (data ?? []).filter((c) => c.estado === "firmado");
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const puede = permisos.cambiarEstado(usuario.rol);

  const Tabla = ({ filas, pendiente }: { filas: typeof pendientes; pendiente: boolean }) => (
    <div className="overflow-hidden rounded-lg border border-linea bg-white">
      <table className="w-full text-left text-[13.5px]">
        <thead className="border-b border-linea bg-lienzo text-[12px] text-secundario">
          <tr>
            <th className="px-4 py-2.5 font-medium">Contrato</th>
            <th className="px-4 py-2.5 font-medium">Contraparte</th>
            <th className="px-4 py-2.5 font-medium">Aprobado</th>
            <th className="px-4 py-2.5 font-medium">{pendiente ? "" : "Firmado"}</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((c) => (
            <tr key={c.id} className="border-b border-linea last:border-0">
              <td className="px-4 py-3"><Link href={`/contratos/${c.id}`} className="font-medium hover:text-terracota">{c.titulo}</Link></td>
              <td className="px-4 py-3 text-secundario">{c.contraparte}</td>
              <td className="px-4 py-3 text-secundario">{fecha(c.aprobado_en)}</td>
              <td className="px-4 py-3 text-right">
                {pendiente ? puede ? <RegistrarFirma contratoId={c.id} hoy={hoy} /> : <span className="text-secundario">Pendiente</span> : <span className="text-secundario">{fecha(c.firmado_en)}</span>}
              </td>
            </tr>
          ))}
          {filas.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-secundario">{pendiente ? "No hay contratos aprobados pendientes de firma." : "Aún no hay contratos firmados."}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <EncabezadoPagina titulo="Firmas" descripcion="Contratos aprobados por Legal pendientes de firma y contratos ya firmados. La firma se registra manualmente; esta versión no integra firma electrónica." />
      <div className="space-y-6 px-8 py-6">
        <section>
          <h2 className="mb-2 text-[14px] font-semibold">Pendientes de firma</h2>
          <Tabla filas={pendientes} pendiente />
        </section>
        <section>
          <h2 className="mb-2 text-[14px] font-semibold">Firmados</h2>
          <Tabla filas={firmados} pendiente={false} />
        </section>
      </div>
    </div>
  );
}
