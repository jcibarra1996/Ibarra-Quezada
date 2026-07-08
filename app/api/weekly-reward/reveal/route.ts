import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { weekStartISO } from "@/lib/dateHelpers";

export async function POST() {
  const supabase = createAdminClient();
  const week_start = weekStartISO();

  const { data, error } = await supabase
    .from("weekly_rewards")
    .update({ revealed: true, revealed_at: new Date().toISOString() })
    .eq("week_start", week_start)
    .eq("unlocked", true)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reward: data });
}
