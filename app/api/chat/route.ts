import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  const { message } = await request.json();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system:
      "Eres un asistente legal especializado en gestión de contratos. " +
      "Ayudas a revisar fechas de vencimiento, identificar riesgos contractuales " +
      "y redactar resúmenes legales. Responde siempre en español.",
    messages: [{ role: "user", content: message }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ response: text });
}
