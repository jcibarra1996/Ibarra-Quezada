"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { permisos, ROLES, type Rol, type Usuario } from "@/lib/tipos";
import { iniciales } from "@/lib/formato";
import { cambiarPerfil, cerrarSesion } from "@/app/login/acciones";
import { SubirContrato } from "./subir-contrato";

interface Entrada {
  href: string;
  texto: string;
  icono: string;
  soloDirector?: boolean;
  soloLegal?: boolean;
}

// Menú agrupado por lo que hace cada quien: el trabajo del día, la biblioteca de la
// dirección legal y el seguimiento posterior a la firma. Negocio solo ve lo suyo:
// inicio, sus contratos y los expedientes a los que sube documentos.
const GRUPOS: { titulo: string; entradas: Entrada[] }[] = [
  {
    titulo: "Trabajo",
    entradas: [
      { href: "/inicio", texto: "Inicio", icono: "M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1z" },
      { href: "/contratos", texto: "Contratos", icono: "M6 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 6 17zM12 2.5V7h4M8.5 10.5h5M8.5 13.5h5" },
      { href: "/expedientes", texto: "Expedientes", icono: "M3 6.5h5l1.5 1.5H17v8.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5zM3 6.5V4.5a.5.5 0 0 1 .5-.5h4L9 5.5" },
    ],
  },
  {
    titulo: "Biblioteca",
    entradas: [
      { href: "/plantillas", texto: "Plantillas", icono: "M5 2.5h10v15H5zM8 6h4M8 9h4M8 12h2", soloLegal: true },
      { href: "/playbook", texto: "Reglas", icono: "M4 4.5h5a2 2 0 0 1 2 2V17a1.5 1.5 0 0 0-1.5-1.5H4zM16 4.5h-5", soloLegal: true },
    ],
  },
  {
    titulo: "Seguimiento",
    entradas: [
      { href: "/firmas", texto: "Firmas", icono: "M3 15c2-1 3-5 5-5s0 5 2 5 2-3 3.5-3 1 2 2.5 2M3 17.5h14", soloLegal: true },
      { href: "/vencimientos", texto: "Vencimientos", icono: "M4 5h12v12H4zM4 8.5h12M7.5 3v3M12.5 3v3", soloLegal: true },
      { href: "/reportes", texto: "Reportes", icono: "M4 16.5V10M8.5 16.5V5M13 16.5v-8M17 16.5H3", soloDirector: true },
    ],
  },
];

function Icono({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-[18px] w-[18px] shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

// Cierra un menú flotante al hacer clic fuera o presionar Escape.
function useCerrarFuera(abierto: boolean, cerrar: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const clic = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && cerrar();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto, cerrar]);
  return ref;
}

function NuevoContrato({ areas }: { areas: { id: string; nombre: string }[] }) {
  const [menu, setMenu] = useState(false);
  const [subir, setSubir] = useState(false);
  const ref = useCerrarFuera(menu, () => setMenu(false));
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setMenu(!menu)}
        aria-expanded={menu}
        aria-haspopup="menu"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-mandarina text-[14px] font-medium text-tinta hover:bg-mandarina-oscuro"
      >
        <Icono d="M10 4.5v11M4.5 10h11" />
        Nuevo contrato
      </button>
      {menu && (
        <div role="menu" className="absolute left-0 right-0 top-12 z-40 rounded-lg border border-linea bg-white p-1.5 shadow-[var(--shadow-flotante)]">
          <button
            role="menuitem"
            onClick={() => {
              setMenu(false);
              setSubir(true);
            }}
            className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-gris-50"
          >
            <Icono d="M10 13.5V4M6 7.5 10 3.5l4 4M4 16.5h12" className="mt-0.5 text-mandarina-texto" />
            <span>
              <span className="block text-[13.5px] font-medium text-tinta">Subir contrato</span>
              <span className="block text-[12px] text-secundario">El que envió la contraparte</span>
            </span>
          </button>
          <Link role="menuitem" href="/plantillas" onClick={() => setMenu(false)} className="flex items-start gap-3 rounded-md px-3 py-2.5 hover:bg-gris-50">
            <Icono d="M5 2.5h10v15H5zM8 6h4M8 9h4M8 12h2" className="mt-0.5 text-mandarina-texto" />
            <span>
              <span className="block text-[13.5px] font-medium text-tinta">Desde plantilla</span>
              <span className="block text-[12px] text-secundario">Se llena con los expedientes</span>
            </span>
          </Link>
        </div>
      )}
      <SubirContrato areas={areas} control={{ abierto: subir, alCambiar: setSubir }} />
    </div>
  );
}

function Perfil({ usuario, equipo, demo }: { usuario: Usuario; equipo: { id: string; nombre: string; puesto: string | null; rol: Rol }[]; demo: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useCerrarFuera(abierto, () => setAbierto(false));
  const otros = equipo.filter((m) => m.id !== usuario.id);
  return (
    <div ref={ref} className="relative border-t border-tinta-borde p-3">
      {abierto && (
        <div className="absolute bottom-[calc(100%-4px)] left-3 right-3 z-40 rounded-lg border border-linea bg-white p-1.5 text-tinta shadow-[var(--shadow-flotante)]">
          {demo && otros.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-secundario">Ver la demo como</p>
              {otros.map((m) => (
                <form key={m.id} action={cambiarPerfil.bind(null, m.id)}>
                  <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left hover:bg-gris-50">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gris-100 text-[11px] font-semibold">{iniciales(m.nombre)}</span>
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-[13px] font-medium">{m.nombre}</span>
                      <span className="block truncate text-[11.5px] text-secundario">{ROLES[m.rol]}</span>
                    </span>
                  </button>
                </form>
              ))}
              <div className="my-1 border-t border-linea" />
            </>
          )}
          <form action={cerrarSesion}>
            <button className="w-full rounded-md px-3 py-2 text-left text-[13px] text-secundario hover:bg-gris-50 hover:text-tinta">Cerrar sesión</button>
          </form>
        </div>
      )}
      <button
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-tinta-claro"
        title={demo ? "Cambiar de perfil o cerrar sesión" : "Cerrar sesión"}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mandarina text-[12px] font-semibold text-tinta">{iniciales(usuario.nombre)}</span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-medium text-white">{usuario.nombre}</span>
          <span className="block truncate text-[11.5px] text-sobre-tinta-tenue">{ROLES[usuario.rol]}</span>
        </span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-sobre-tinta-tenue" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
          <path d="M6 12l4-4 4 4" />
        </svg>
      </button>
      {demo && <p className="px-2 pt-1.5 text-[11px] text-sobre-tinta-tenue">Demo: cambie de perfil desde aquí.</p>}
    </div>
  );
}

export interface Destacado {
  etiqueta: string;
  titulo: string;
  detalle: string;
  urgente: boolean;
  href: string;
}

// Tarjeta al pie del menú con lo único que conviene tener siempre a la vista.
function TarjetaDestacada({ d }: { d: Destacado }) {
  return (
    <Link href={d.href} className="mx-3 mb-3 block rounded-lg border border-tinta-borde bg-tinta-claro/60 px-3.5 py-3 hover:bg-tinta-claro">
      <span className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-sobre-tinta-tenue">{d.etiqueta}</span>
      <span className="mt-1 line-clamp-2 block text-[13px] font-medium leading-snug text-white">{d.titulo}</span>
      <span className={`mt-1 block text-[12px] ${d.urgente ? "font-semibold text-mandarina" : "text-sobre-tinta-tenue"}`}>{d.detalle}</span>
    </Link>
  );
}

export function MenuLateral({
  usuario,
  equipo,
  areas,
  demo,
  organizacion,
  contadores,
  destacado,
}: {
  demo: boolean;
  usuario: Usuario;
  equipo: { id: string; nombre: string; puesto: string | null; rol: Rol }[];
  areas: { id: string; nombre: string }[];
  organizacion: string;
  contadores: Record<string, { n: number; texto: string }>;
  destacado: Destacado | null;
}) {
  const ruta = usePathname();
  return (
    <aside className="flex w-[252px] shrink-0 flex-col bg-tinta text-sobre-tinta">
      <div className="px-5 pb-5 pt-6">
        <Logo invertido />
        {organizacion && <p className="mt-2.5 truncate text-[11.5px] text-sobre-tinta-tenue" title={organizacion}>{organizacion}</p>}
      </div>
      <div className="px-4 pb-5">
        {usuario.rol === "negocio" ? (
          // Quien pide un contrato no lo "sube" ni lo "crea": lo solicita, y Legal lo revisa.
          <Link
            href="/solicitar"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-mandarina text-[14px] font-medium text-tinta hover:bg-mandarina-oscuro"
          >
            <Icono d="M10 4.5v11M4.5 10h11" />
            Solicitar nuevo contrato
          </Link>
        ) : (
          <NuevoContrato areas={areas} />
        )}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3" aria-label="Principal">
        {GRUPOS.map((g) => {
          const entradas = g.entradas.filter(
            (e) => (!e.soloDirector || usuario.rol === "director_juridico") && (!e.soloLegal || permisos.verBiblioteca(usuario.rol)),
          );
          if (!entradas.length) return null;
          return (
            <div key={g.titulo}>
              <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-sobre-tinta-tenue">{g.titulo}</p>
              <div className="space-y-0.5">
                {entradas.map((e) => {
                  const activa = ruta === e.href || ruta.startsWith(`${e.href}/`);
                  const c = contadores[e.href];
                  return (
                    <Link
                      key={e.href}
                      href={e.href}
                      aria-current={activa ? "page" : undefined}
                      className={`relative flex h-9 items-center gap-3 rounded-lg px-3 text-[14px] transition-colors ${
                        activa ? "bg-tinta-claro font-medium text-white" : "text-sobre-tinta hover:bg-tinta-claro/70 hover:text-white"
                      }`}
                    >
                      {activa && <span className="absolute left-0 top-2 h-5 w-[3px] rounded-r bg-mandarina" aria-hidden />}
                      <Icono d={e.icono} className={activa ? "text-mandarina-texto" : "text-sobre-tinta-tenue"} />
                      <span className="flex-1">{e.texto}</span>
                      {c && c.n > 0 && (
                        <span className="rounded-full bg-mandarina px-1.5 py-px text-[11px] font-semibold tabular-nums text-tinta" title={`${c.n} ${c.texto}`} aria-label={`${c.n} ${c.texto}`}>
                          {c.n}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      {destacado && <TarjetaDestacada d={destacado} />}
      {/* La clave cierra el menú al cambiar de perfil. */}
      <Perfil key={usuario.id} usuario={usuario} equipo={equipo} demo={demo} />
    </aside>
  );
}
