import "server-only";
import { analizarContrato } from "./analizar";

// Lanza el análisis sin bloquear la respuesta. Los errores quedan registrados en el propio
// análisis (estado "error"), que Legal ve al abrir el contrato.
export async function analizarEnSegundoPlano(p: { contratoId: string; orgId: string; usuarioId: string }) {
  try {
    await analizarContrato(p);
  } catch {
    // analizarContrato ya registró el error sin texto del contrato.
  }
}
