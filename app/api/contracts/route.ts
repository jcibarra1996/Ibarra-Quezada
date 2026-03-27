import { NextResponse } from "next/server";

export async function GET() {
  // TODO: query Supabase contracts table
  return NextResponse.json({ contracts: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  // TODO: insert into Supabase contracts table
  return NextResponse.json({ contract: body }, { status: 201 });
}
