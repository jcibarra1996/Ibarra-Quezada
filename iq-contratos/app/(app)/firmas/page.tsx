import Link from "next/link";
import { EncabezadoPagina } from "@/components/ui/encabezado";
import { RegistrarFirma } from "@/components/firmas/registrar-firma";
import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { fecha } from "@/lib/formato";
import { permisos } from "@/lib/tipos";
import { credencialesMifiel } from "@/lib/firmas/mifiel";
import { ConexionMifiel } from "@/components/firmas/conexion-mifiel";

export const metadata = { title: "Firmas" };

export default async function Firmas() {
  const usuario = await exigirUsuario();
  const supabase = await clienteSesion();
  const director = permisos.editarPlaybook(usuario.rol);
  const [cred, { data: integracion }] = await Promise.all([
    credencialesMifiel(usuario.org_id),
    supabase.from("integraciones").select("app_id, avisos_conectados_en").eq("proveedor", "mifiel").maybeSingle(),
  ]);
  const { data } = await supabase
    .from("contracts")
    .select("id, titulo, contraparte, estado, aprobado_en, firmado_en, signature_requests(id, estado, firmantes, creado_en)")
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
            <th className="px-4 py-2.5 font-medium">Firma electrónica</th>
            <th className="px-4 py-2.5 font-medium">{pendiente ? "" : "Firmado"}</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((c) => (
            <tr key={c.id} className="border-b border-linea last:border-0">
              <td className="px-4 py-3"><Link href={`/contratos/${c.id}`} className="font-medium hover:text-terracota">{c.titulo}</Link></td>
              <td className="px-4 py-3 text-secundario">{c.contraparte}</td>
              <td className="px-4 py-3 text-secundario">{fecha(c.aprobado_en)}</td>
              <td className="px-4 py-3">{estadoFirma(c.signature_requests)}</td>
              <td className="px-4 py-3 text-right">
                {pendiente ? (
                  puede ? (
                    <span className="inline-flex items-center gap-3">
                      <Link href={`/contratos/${c.id}`} className="text-[13px] font-medium text-terracota hover:underline">
                        Firmar con Mifiel
                      </Link>
                      <RegistrarFirma contratoId={c.id} hoy={hoy} />
                    </span>
                  ) : (
                    <span className="text-secundario">Pendiente</span>
                  )
                ) : (
                  <span className="text-secundario">{fecha(c.firmado_en)}</span>
                )}
              </td>
            </tr>
          ))}
          {filas.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-secundario">{pendiente ? "No hay contratos aprobados pendientes de firma." : "Aún no hay contratos firmados."}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <EncabezadoPagina
        titulo="Firmas"
        descripcion="Contratos aprobados por Legal pendientes de firma y contratos ya firmados. Firma electrónica con Mifiel (e.firma y constancia NOM-151) desde cada contrato, o registro manual de una firma autógrafa."
      />
      <div className="space-y-6 px-8 py-6">
        <section className="rounded-xl border border-linea bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="titulo text-[18px]">Firma electrónica con Mifiel</h2>
              <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-secundario">
                Legal envía el PDF final de un contrato aprobado; cada firmante recibe un correo de Mifiel y firma con su e.firma del SAT. Al concluir, el portal guarda el
                PDF firmado y el XML con la constancia de conservación (NOM-151) y marca el contrato como firmado. El botón <span className="font-medium text-tinta">Firmar con Mifiel</span>{" "}
                está en el encabezado de cada contrato.
              </p>
            </div>
            {cred ? (
              <span className="shrink-0 rounded-full bg-bajo-suave px-3 py-1 text-[12px] font-medium text-bajo">
                Conectado · {cred.entorno === "sandbox" ? "pruebas" : "producción"}
                {integracion?.app_id ? ` · APP_ID …${integracion.app_id.slice(-4)}` : ""}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-medio-suave px-3 py-1 text-[12px] font-medium text-medio">Sin conectar</span>
            )}
          </div>
          {director ? (
            <ConexionMifiel conectado={cred !== null} avisosConectados={Boolean(integracion?.avisos_conectados_en)} />
          ) : (
            !cred && <p className="mt-3 text-[12.5px] text-secundario">La dirección jurídica conecta la cuenta de Mifiel de la empresa desde esta página.</p>
          )}
        </section>
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

function estadoFirma(lista: { estado: string; firmantes: { firmado: boolean }[]; creado_en: string }[] | null) {
  const s = [...(lista ?? [])].sort((a, b) => b.creado_en.localeCompare(a.creado_en))[0];
  if (!s) return <span className="text-secundario">Sin enviar</span>;
  if (s.estado === "firmado") return <span className="text-bajo">Firmado con Mifiel</span>;
  if (s.estado === "enviado") return <span className="text-medio">En Mifiel: {s.firmantes.filter((f) => f.firmado).length} de {s.firmantes.length} firmaron</span>;
  return <span className="text-burgundy">{s.estado === "rechazado" ? "Rechazado por un firmante" : "Error al enviar"}</span>;
}
