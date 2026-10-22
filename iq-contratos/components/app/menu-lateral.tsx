"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { ROLES, type Rol, type Usuario } from "@/lib/tipos";
import { iniciales } from "@/lib/formato";
import { cambiarPerfil, cerrarSesion } from "@/app/login/acciones";
import { SubirContrato } from "./subir-contrato";

const ENTRADAS = [
  { href: "/inicio", texto: "Inicio", icono: "M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1z" },
  { href: "/contratos", texto: "Contratos", icono: "M6 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 6 17zM12 2.5V7h4M8.5 10.5h5M8.5 13.5h5" },
  { href: "/expedientes", texto: "Expedientes corporativos", icono: "M3 6.5h5l1.5 1.5H17v8.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5zM3 6.5V4.5a.5.5 0 0 1 .5-.5h4L9 5.5" },
  { href: "/plantillas", texto: "Plantillas", icono: "M5 2.5h10v15H5zM8 6h4M8 9h4M8 12h2" },
  { href: "/vencimientos", texto: "Vencimientos", icono: "M4 5h12v12H4zM4 8.5h12M7.5 3v3M12.5 3v3", contador: true },
  { href: "/playbook", texto: "Playbook", icono: "M4 4.5h5a2 2 0 0 1 2 2V17a1.5 1.5 0 0 0-1.5-1.5H4zM16 4.5h-5" },
  { href: "/firmas", texto: "Firmas", icono: "M3 15c2-1 3-5 5-5s0 5 2 5 2-3 3.5-3 1 2 2.5 2M3 17.5h14" },
  { href: "/reportes", texto: "Reportes", icono: "M4 16.5V10M8.5 16.5V5M13 16.5v-8M17 16.5H3" },
];

export function MenuLateral({
  usuario,
  equipo,
  vencimientos,
  areas,
  demo,
}: {
  demo: boolean;
  usuario: Usuario;
  equipo: { id: string; nombre: string; puesto: string | null; rol: Rol }[];
  vencimientos: number;
  areas: { id: string; nombre: string }[];
}) {
  const ruta = usePathname();
  return (
    <aside className="flex w-[244px] shrink-0 flex-col border-r border-linea bg-white">
      <div className="px-5 pb-4 pt-5">
        <Logo />
      </div>
      <div className="space-y-1.5 px-4 pb-4">
        {usuario.rol === "negocio" ? (
          // Quien pide un contrato no "sube" ni "crea": lo solicita, y Legal lo revisa.
          <Link
            href="/solicitar"
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-terracota text-[13px] font-medium text-white hover:bg-terracota-oscuro"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <path d="M10 4.5v11M4.5 10h11" />
            </svg>
            Solicitar nuevo contrato
          </Link>
        ) : (
          <>
            <SubirContrato areas={areas} />
            <Link href="/plantillas" className="flex h-8 w-full items-center justify-center rounded-md border border-linea-fuerte text-[13px] font-medium hover:bg-gris-50">
              Crear desde plantilla
            </Link>
          </>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Principal">
        {ENTRADAS.filter((e) => e.href !== "/reportes" || usuario.rol === "director_juridico").map((e) => {
          const activa = ruta === e.href || ruta.startsWith(`${e.href}/`);
          return (
            <Link
              key={e.href}
              href={e.href}
              aria-current={activa ? "page" : undefined}
              className={`flex h-9 items-center gap-3 rounded-md px-2.5 text-[13.5px] transition-colors ${
                activa ? "bg-crema font-medium text-tinta" : "text-secundario hover:bg-gris-50 hover:text-tinta"
              }`}
            >
              <svg viewBox="0 0 20 20" className={`h-[18px] w-[18px] shrink-0 ${activa ? "text-terracota" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
                <path d={e.icono} />
              </svg>
              <span className="flex-1">{e.texto}</span>
              {e.contador && vencimientos > 0 && (
                <span className="rounded-full bg-terracota px-1.5 py-px text-[11px] font-semibold text-white" aria-label={`${vencimientos} vencimientos próximos`}>
                  {vencimientos}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-linea px-5 py-4">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-secundario">{demo ? "Ver la demo como" : "Equipo"}</p>
        <ul className="space-y-1">
          {equipo.map((m) => {
            const yo = m.id === usuario.id;
            const contenido = (
              <>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${yo ? "bg-tinta text-white" : "bg-gris-100 text-tinta"}`}>
                  {iniciales(m.nombre)}
                </span>
                <span className="min-w-0 flex-1 text-left leading-tight">
                  <span className="block truncate text-[13px] font-medium">{m.nombre}</span>
                  <span className="block truncate text-[11.5px] text-secundario">
                    {ROLES[m.rol]}
                    {yo && demo ? " · usted" : ""}
                  </span>
                </span>
              </>
            );
            return (
              <li key={m.id}>
                {demo && !yo ? (
                  <form action={cambiarPerfil.bind(null, m.id)}>
                    <button className="-mx-1.5 flex w-[calc(100%+12px)] items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-gris-50" title={`Entrar como ${m.nombre} (${ROLES[m.rol]})`}>
                      {contenido}
                    </button>
                  </form>
                ) : (
                  <div className={`-mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-1 ${yo && demo ? "bg-crema" : ""}`}>{contenido}</div>
                )}
              </li>
            );
          })}
        </ul>
        {demo && <p className="mt-2 text-[11px] leading-snug text-secundario">Haga clic en un perfil para recorrer la plataforma con sus permisos.</p>}
      </div>
      <div className="flex items-center justify-between border-t border-linea px-5 py-3 text-[12px] text-secundario">
        <span className="truncate" title={`${usuario.nombre}, ${ROLES[usuario.rol]}`}>
          {ROLES[usuario.rol]}
        </span>
        <form action={cerrarSesion}>
          <button className="hover:text-tinta">Salir</button>
        </form>
      </div>
    </aside>
  );
}
