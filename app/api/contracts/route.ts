import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .order("expiration_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contracts: data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { data, error } = await supabase
    .from("contracts")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contract: data }, { status: 201 });
}
