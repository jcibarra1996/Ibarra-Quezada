import { NextResponse } from "next/server";

export async function GET() {
  // TODO: query Supabase notifications_log table
  return NextResponse.json({ notifications: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  // TODO: insert into Supabase notifications_log table
  return NextResponse.json({ notification: body }, { status: 201 });
}
