/**
 * Envío de WhatsApp. Descartamos Web Push (inestable en iOS) y usamos
 * uno de dos proveedores server-side, elegido por WHATSAPP_PROVIDER:
 *  - "meta":   Meta Cloud API (WhatsApp Business Platform)
 *  - "twilio": Twilio WhatsApp API
 */
export async function sendWhatsApp(text: string): Promise<void> {
  const provider = Deno.env.get("WHATSAPP_PROVIDER") ?? "meta";

  if (provider === "twilio") {
    await sendViaTwilio(text);
  } else {
    await sendViaMeta(text);
  }
}

async function sendViaMeta(text: string): Promise<void> {
  const phoneNumberId = Deno.env.get("META_WA_PHONE_NUMBER_ID");
  const accessToken = Deno.env.get("META_WA_ACCESS_TOKEN");
  const to = Deno.env.get("META_WA_TO_NUMBER");

  if (!phoneNumberId || !accessToken || !to) {
    console.error("Meta Cloud API sin configurar, se omite el envío");
    return;
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text, preview_url: true },
    }),
  });

  if (!res.ok) {
    console.error("Meta Cloud API error", res.status, await res.text());
  }
}

async function sendViaTwilio(text: string): Promise<void> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_WHATSAPP_FROM");
  const to = Deno.env.get("TWILIO_WHATSAPP_TO");

  if (!accountSid || !authToken || !from || !to) {
    console.error("Twilio sin configurar, se omite el envío");
    return;
  }

  const body = new URLSearchParams({ From: from, To: to, Body: text });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    console.error("Twilio error", res.status, await res.text());
  }
}
