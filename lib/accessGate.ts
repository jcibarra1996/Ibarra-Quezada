export const GATE_COOKIE = "iq_gate";
export const GATE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

/**
 * El cookie de acceso nunca guarda el secreto en texto plano: guarda el
 * hash. Así, aunque alguien inspeccione las cookies del dispositivo, no
 * recupera el APP_ACCESS_KEY real. Corre en Edge (middleware) y en Node
 * (route handler) porque usa Web Crypto, disponible en ambos runtimes.
 */
export async function gateToken(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`iq-taskforge:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
