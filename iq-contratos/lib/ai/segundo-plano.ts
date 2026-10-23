import "server-only";
import { analizarContrato } from "./analizar";
import { llenarFichaSinFallar } from "./ficha";

// Lanza el análisis y el llenado de la ficha sin bloquear la respuesta. Los errores del
// análisis quedan en el propio análisis (estado "error"), que Legal ve al abrir el
// contrato; los de la ficha, en el registro, y la ficha se puede llenar a mano.
export async function analizarEnSegundoPlano(p: { contratoId: string; orgId: string; usuarioId: string }) {
  await Promise.all([
    analizarContrato(p).catch(() => {
      // analizarContrato ya registró el error sin texto del contrato.
    }),
    llenarFichaSinFallar(p),
  ]);
}
