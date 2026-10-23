import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { usuarioActual } from "@/lib/auth/sesion";
import { USUARIOS_DEMO, CONTRASENA_DEMO } from "@/lib/demo";
import { FormularioIngreso } from "./formulario";

export const metadata = { title: "Ingresar" };

const PASOS = [
  ["Solicitud", "Negocio pide el contrato y adjunta los documentos corporativos."],
  ["Primera lectura", "La IA compara contra su playbook y verifica declaraciones."],
  ["Decisión", "Legal valida cada hallazgo, aprueba y envía a firma."],
];

export default async function PaginaIngreso() {
  if (await usuarioActual()) redirect("/inicio");
  const demo = process.env.MODO_DEMO === "true" ? { usuarios: USUARIOS_DEMO, contrasena: CONTRASENA_DEMO } : null;
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-tinta px-12 py-10 text-sobre-tinta lg:flex">
        <Logo invertido />
        <div className="max-w-[460px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracota">Gestión de contratos con revisión por IA</p>
          <h2 className="titulo mt-4 text-[40px] leading-[1.12] text-white">La IA hace la primera lectura. Su equipo decide.</h2>
          <ol className="mt-10 space-y-5">
            {PASOS.map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-tinta-borde font-serif text-[13px] text-white">{i + 1}</span>
                <span>
                  <span className="block text-[14px] font-medium text-white">{t}</span>
                  <span className="block text-[13px] leading-relaxed text-sobre-tinta-tenue">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-[12px] text-sobre-tinta-tenue">Derecho mexicano · Documentos en almacenamiento privado · Bitácora de acceso</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h1 className="titulo text-[28px] leading-tight">Ingrese a su espacio</h1>
          <p className="mb-7 mt-1.5 text-[14px] text-secundario">Use la cuenta que le asignó la dirección jurídica.</p>
          <div className="rounded-xl border border-linea bg-white p-6 shadow-[var(--shadow-tarjeta)]">
            <FormularioIngreso demo={demo} />
          </div>
          <p className="mt-6 text-[12px] leading-relaxed text-secundario">
            Herramienta de apoyo para la revisión de contratos. La decisión final sobre cada documento corresponde al abogado responsable.
          </p>
        </div>
      </section>
    </main>
  );
}
