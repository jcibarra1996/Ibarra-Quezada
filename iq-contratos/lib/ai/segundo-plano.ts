import "server-only";
import { analizarContrato } from "./analizar";
import { llenarFichaSinFallar } from "./ficha";

// Llena la ficha y luego analiza, sin bloquear la respuesta. La ficha va primero (es corta)
// para que el análisis ya conozca el tipo por el objeto y reciba solo su playbook. Los
// errores del análisis quedan en el propio análisis (estado "error"), que Legal ve al abrir
// el contrato; los de la ficha, en el registro, y la ficha se puede llenar a mano.
export async function analizarEnSegundoPlano(p: { contratoId: string; orgId: string; usuarioId: string }) {
  await llenarFichaSinFallar(p);
  await analizarContrato(p).catch(() => {
    // analizarContrato ya registró el error sin texto del contrato.
  });
}
