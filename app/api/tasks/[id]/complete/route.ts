import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString(), completed_via: "app" })
    .eq("id", id)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    event_type: "task_completed",
    context: data.context,
    metadata: { task_id: data.id, via: "app" },
  });

  return NextResponse.json({ task: data });
}
