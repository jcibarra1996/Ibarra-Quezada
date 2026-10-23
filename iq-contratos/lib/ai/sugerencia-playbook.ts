// Esquema de las sugerencias de la IA para el playbook y su limpieza antes de mostrarlas.
import { z } from "zod";

export const SugerenciaSchema = z.object({
  tema: z.string().describe('Tema breve de la posición, por ejemplo "Intereses moratorios" o "Jurisdicción".'),
  preferida: z.string().describe("Lo que la empresa busca obtener en este tema. Concreto: plazos, porcentajes, topes o condiciones."),
  respaldo: z.string().describe("Lo que la empresa puede aceptar si la contraparte no acepta la preferida, sin quedar expuesta."),
  nunca_se_acepta: z.string().describe("Lo que la empresa no debe aceptar en ningún caso, y por qué en una frase."),
  clausula_modelo: z.string().describe('Cláusula modelo completa, en formato mexicano, con términos definidos genéricos ("LA EMPRESA", "LA CONTRAPARTE") y datos variables entre corchetes, por ejemplo [monto].'),
  referencias_normativas: z.array(z.string()).describe("Leyes u ordenamientos relacionados, nombrados de forma general (sin número de artículo). Vacío si no aplica."),
  por_verificar: z.string().describe("Lo que la dirección jurídica debe confirmar antes de adoptar la posición (criterios internos, montos, vigencia de la norma). Cadena vacía si nada."),
});

export const RespuestaSchema = z.object({ posiciones: z.array(SugerenciaSchema) });

export type SugerenciaPosicion = z.infer<typeof SugerenciaSchema>;

// Quita rayas largas (em dash), recorta longitudes y descarta temas vacíos o repetidos.
export function limpiarSugerencias(posiciones: SugerenciaPosicion[], existentes: { tema: string }[], tema?: string): SugerenciaPosicion[] {
  const clave = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const vistos = new Set(tema ? [] : existentes.map((e) => clave(e.tema)));
  const texto = (s: string, max: number) => s.replace(/\s*\u2014\s*/g, ", ").trim().slice(0, max);
  const salida: SugerenciaPosicion[] = [];
  for (const s of posiciones) {
    const t = texto(tema ?? s.tema, 120);
    if (!t || vistos.has(clave(t))) continue;
    vistos.add(clave(t));
    salida.push({
      tema: t,
      preferida: texto(s.preferida, 6000),
      respaldo: texto(s.respaldo, 6000),
      nunca_se_acepta: texto(s.nunca_se_acepta, 6000),
      clausula_modelo: texto(s.clausula_modelo, 6000),
      referencias_normativas: s.referencias_normativas.map((r) => texto(r, 200)).filter(Boolean).slice(0, 6),
      por_verificar: texto(s.por_verificar, 1000),
    });
    if (tema) break;
  }
  return salida;
}
