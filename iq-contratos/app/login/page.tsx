import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { usuarioActual } from "@/lib/auth/sesion";
import { USUARIOS_DEMO, CONTRASENA_DEMO } from "@/lib/demo";
import { FormularioIngreso } from "./formulario";

export const metadata = { title: "Ingresar" };

export default async function PaginaIngreso() {
  if (await usuarioActual()) redirect("/inicio");
  const demo = process.env.MODO_DEMO === "true" ? { usuarios: USUARIOS_DEMO, contrasena: CONTRASENA_DEMO } : null;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8">
          <Logo />
        </div>
        <h1 className="mb-1 text-[22px] font-semibold tracking-tight">Ingrese a su espacio de revisión</h1>
        <p className="mb-6 text-[14px] text-secundario">La IA hace la primera lectura. Su equipo decide.</p>
        <div className="rounded-lg border border-linea bg-white p-6">
          <FormularioIngreso demo={demo} />
        </div>
        <p className="mt-6 text-[12px] leading-relaxed text-secundario">
          Herramienta de apoyo para la revisión de contratos. La decisión final sobre cada documento corresponde al abogado responsable.
        </p>
      </div>
    </main>
  );
}
