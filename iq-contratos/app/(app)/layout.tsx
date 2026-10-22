import { exigirUsuario } from "@/lib/auth/sesion";
import { clienteSesion } from "@/lib/supabase/server";
import { MenuLateral } from "@/components/app/menu-lateral";
import { AvisoApoyo } from "@/components/app/aviso-apoyo";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const supabase = await clienteSesion();
  const limite = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  const [{ data: equipo }, { count: vencimientos }, { data: areas }] = await Promise.all([
    supabase.from("profiles").select("id, nombre, puesto, rol").order("rol"),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("estado", "activa").lte("fecha_limite", limite),
    supabase.from("areas").select("id, nombre").order("nombre"),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <MenuLateral usuario={usuario} equipo={equipo ?? []} vencimientos={vencimientos ?? 0} areas={areas ?? []} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        <AvisoApoyo />
      </div>
    </div>
  );
}
