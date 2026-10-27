import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { MenuLateral, type Destacado } from "@/components/app/menu-lateral";
import { AvisoApoyo } from "@/components/app/aviso-apoyo";
import { hoyMx, pendientes } from "@/lib/inicio/pendientes";
import { ESTADOS } from "@/lib/tipos";

const enDias = (fechaLimite: string, hoy: string) => Math.round((Date.parse(`${fechaLimite}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`)) / 864e5);

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const supabase = await clienteSesion();
  const hoy = hoyMx();
  const [p, { data: equipo }, { data: areas }, { data: org }, { data: proximo }] = await Promise.all([
    pendientes(usuario),
    supabase.from("profiles").select("id, nombre, puesto, rol").order("rol"),
    supabase.from("areas").select("id, nombre").order("nombre"),
    supabase.from("organizations").select("nombre, es_demo").maybeSingle(),
    supabase.from("alerts").select("titulo, fecha_limite, contract_id").eq("estado", "activa").order("fecha_limite").limit(1).maybeSingle(),
  ]);

  // Lo que cada perfil necesita ver junto a cada entrada del menú.
  const contadores: Record<string, { n: number; texto: string }> = p.legal
    ? {
        "/contratos": { n: p.porRevisar, texto: "por revisar" },
        "/expedientes": { n: p.expedientes, texto: "por validar" },
        "/firmas": { n: p.paraFirma, texto: "listos para firma" },
        "/vencimientos": { n: p.vencimientos, texto: "vencidos o por vencer en 30 días" },
      }
    : { "/contratos": { n: p.enCurso.length, texto: "en curso" } };

  // Una sola cosa destacada al pie del menú: el siguiente vencimiento para Legal y la
  // solicitud más reciente para Negocio.
  let destacado: Destacado | null = null;
  if (p.legal && proximo) {
    const d = enDias(proximo.fecha_limite, hoy);
    destacado = {
      etiqueta: "Próximo vencimiento",
      titulo: proximo.titulo,
      detalle: d < 0 ? `Venció hace ${-d} ${-d === 1 ? "día" : "días"}` : d === 0 ? "Vence hoy" : `En ${d} ${d === 1 ? "día" : "días"}`,
      urgente: d <= 7,
      href: `/contratos/${proximo.contract_id}`,
    };
  } else if (!p.legal && p.enCurso.length) {
    const ultima = [...p.enCurso].sort((a, b) => b.recibido_en.localeCompare(a.recibido_en))[0];
    destacado = { etiqueta: "Su solicitud más reciente", titulo: ultima.titulo, detalle: ESTADOS[ultima.estado], urgente: false, href: `/contratos/${ultima.id}` };
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <MenuLateral
        usuario={usuario}
        equipo={equipo ?? []}
        areas={areas ?? []}
        demo={org?.es_demo === true}
        organizacion={org?.nombre ?? ""}
        contadores={contadores}
        destacado={destacado}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        <AvisoApoyo />
      </div>
    </div>
  );
}
