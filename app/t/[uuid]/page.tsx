import { createAdminClient } from "@/lib/supabase/server";
import { MagicComplete } from "@/components/MagicComplete";

export const dynamic = "force-dynamic";

export default async function MagicLinkPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const supabase = createAdminClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, context, status, share_token")
    .eq("share_token", uuid)
    .maybeSingle();

  if (!task) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-void px-6 text-center">
        <p className="text-lg font-bold text-white">Este link no existe.</p>
      </main>
    );
  }

  if (task.status !== "pending") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-void px-6 text-center">
        <p className="text-lg font-bold text-ok">Esta tarea ya quedó resuelta. Gracias 🙌</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-void px-6 text-center">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/40">
          Te pidieron ayuda con
        </span>
        <h1 className="max-w-sm text-2xl font-bold leading-snug text-white">{task.title}</h1>
      </div>
      <MagicComplete token={task.share_token} context={task.context} />
    </main>
  );
}
