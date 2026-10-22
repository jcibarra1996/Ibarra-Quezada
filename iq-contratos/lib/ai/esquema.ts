// Esquema de la salida del modelo. Se usa dos veces: para pedir salida estructurada
// a la API y para validar en el servidor lo que regresa, antes de guardar nada.
import { z } from "zod";

export const TIPOS = ["suministro", "prestacion_servicios", "obra", "arrendamiento", "confidencialidad", "compraventa", "otro"] as const;
export const RIESGOS = ["alto", "medio", "bajo"] as const;
export const TIPOS_FECHA = ["inicio_vigencia", "fin_vigencia", "renovacion_automatica", "plazo_aviso", "vencimiento", "pago"] as const;

export const HallazgoSchema = z.object({
  clausula: z.string().describe('Etiqueta de la sección tal como aparece en el contrato, por ejemplo "QUINTA" o "DECLARACIÓN I".'),
  cita_textual: z.string().describe("Copia exacta, carácter por carácter y continua, del fragmento del contrato que origina el hallazgo. Sin puntos suspensivos ni paráfrasis."),
  tema: z.string().describe("Tema del playbook al que corresponde, o un tema breve si no está en el playbook."),
  posicion_playbook_id: z.string().nullable().describe("Identificador de la posición del playbook aplicada, o null."),
  tipo: z.enum(["desviacion_playbook", "ajena_al_objeto", "dato_corporativo"]),
  nivel_riesgo: z.enum(RIESGOS),
  explicacion: z.string().describe("Explicación en lenguaje claro para el abogado, de dos a cuatro oraciones."),
  redaccion_propuesta: z.string().describe("Texto que sustituye exactamente a cita_textual. Cadena vacía si la propuesta es eliminar el fragmento."),
  referencias_normativas: z.array(z.string()).describe("Normas mencionadas en la explicación. Normalmente vacío. Se mostrarán como pendientes de verificación."),
});

export const OmisionSchema = z.object({
  tema: z.string(),
  posicion_playbook_id: z.string().nullable(),
  nivel_riesgo: z.enum(RIESGOS),
  explicacion: z.string(),
  clausula_propuesta: z.string().describe("Cláusula completa que se propone agregar, basada en la cláusula modelo del playbook."),
});

export const FechaSchema = z.object({
  tipo: z.enum(TIPOS_FECHA),
  descripcion: z.string(),
  fecha: z.string().nullable().describe("AAAA-MM-DD solo si el contrato la fija expresamente. No calcular fechas."),
  regla: z.string().nullable().describe('Regla tal como la establece el contrato, por ejemplo "renovación por periodos de un año".'),
  dias_aviso: z.number().int().nullable(),
  dias_aviso_tipo: z.enum(["naturales", "habiles"]).nullable(),
  periodo_renovacion_meses: z.number().int().nullable(),
  clausula: z.string(),
  cita_textual: z.string(),
});

export const AnalisisSchema = z.object({
  clasificacion: z.object({
    tipo_contrato: z.enum(TIPOS),
    objeto: z.string().describe("Descripción breve del objeto del contrato."),
    cita_objeto: z.string().describe("Cita exacta donde el contrato define su objeto."),
    contraparte: z.string().nullable().describe("Denominación de la contraparte tal como aparece en el contrato."),
  }),
  resumen_negocio: z.string().describe("Dos o tres líneas en lenguaje sencillo para el área de negocio."),
  hallazgos: z.array(HallazgoSchema),
  omisiones: z.array(OmisionSchema).describe("Temas del playbook que el contrato no regula y que conviene agregar."),
  fechas_clave: z.array(FechaSchema),
});

export type Analisis = z.infer<typeof AnalisisSchema>;
export type HallazgoModelo = z.infer<typeof HallazgoSchema>;
export type FechaModelo = z.infer<typeof FechaSchema>;
