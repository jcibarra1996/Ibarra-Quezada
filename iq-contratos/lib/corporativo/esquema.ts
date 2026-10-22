// Salida del modelo al leer un documento corporativo. Se usa para pedir salida
// estructurada y para validar en el servidor antes de tocar el expediente.
import { z } from "zod";
import { CLAVES_CAMPO, CAMPO, rfcValido, type ClaveCampo, type TipoDocumento } from "./campos";
import { sinRayas } from "@/lib/ai/procesar";

export const TIPOS_DOC = ["acta_constitutiva", "reforma_estatutos", "poder", "constancia_fiscal", "identificacion", "comprobante_domicilio", "otro"] as const;

export const ExtraccionSchema = z.object({
  tipo_documento: z.enum(TIPOS_DOC).describe("Tipo de documento que realmente es, según su contenido."),
  denominacion: z.string().nullable().describe("Denominación o razón social (o nombre completo, si es persona física) tal como aparece en el documento."),
  tipo_persona: z.enum(["moral", "fisica"]).nullable(),
  rfc: z.string().nullable().describe("RFC exactamente como aparece. null si el documento no lo contiene."),
  campos: z
    .array(
      z.object({
        clave: z.enum(CLAVES_CAMPO),
        valor: z.string().describe("Valor tal como consta en el documento. Fechas en formato AAAA-MM-DD."),
        cita: z.string().describe("Fragmento textual breve del documento de donde sale el valor."),
        pagina: z.number().int().nullable(),
      }),
    )
    .describe("Solo los datos que el documento contiene expresamente."),
  observaciones: z
    .array(z.string())
    .describe("Puntos que Legal debe revisar: partes ilegibles, facultades limitadas o mancomunadas, documento incompleto, fechas de emisión antiguas."),
  resumen: z.string().describe("Una o dos oraciones que describan el documento."),
});

export type Extraccion = z.infer<typeof ExtraccionSchema>;

export class ErrorExtraccion extends Error {}

export interface ExtraccionLista {
  tipo_documento: TipoDocumento;
  denominacion: string | null;
  tipo_persona: "moral" | "fisica" | null;
  rfc: string | null;
  campos: { clave: ClaveCampo; valor: string; cita: string | null; pagina: number | null }[];
  observaciones: string[];
  resumen: string;
}

const esFechaValida = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// Valida y limpia la salida: descarta fechas mal formadas, RFC con formato inválido y
// campos repetidos. No completa nada que el documento no diga.
export function procesarExtraccion(crudo: unknown): ExtraccionLista {
  const r = ExtraccionSchema.safeParse(crudo);
  if (!r.success) throw new ErrorExtraccion("La respuesta del modelo no cumple el esquema esperado.");
  const a = r.data;
  const vistos = new Set<ClaveCampo>();
  const campos: ExtraccionLista["campos"] = [];
  const observaciones = a.observaciones.map(sinRayas).filter(Boolean);
  for (const c of a.campos) {
    const valor = sinRayas(c.valor.trim());
    if (!valor || vistos.has(c.clave)) continue;
    if (CAMPO[c.clave].tipo === "fecha" && !esFechaValida(valor)) {
      observaciones.push(`No se registró ${CAMPO[c.clave].etiqueta.toLowerCase()} porque la fecha no es legible o no está completa.`);
      continue;
    }
    vistos.add(c.clave);
    campos.push({ clave: c.clave, valor, cita: c.cita.trim() || null, pagina: c.pagina });
  }
  let rfc = a.rfc?.trim().toUpperCase().replace(/[\s-]/g, "") || null;
  if (rfc && !rfcValido(rfc)) {
    observaciones.push(`El RFC que aparece en el documento (${rfc}) no tiene el formato esperado; no se registró.`);
    rfc = null;
  }
  return {
    tipo_documento: a.tipo_documento,
    denominacion: a.denominacion?.trim() || null,
    tipo_persona: a.tipo_persona,
    rfc,
    campos,
    observaciones,
    resumen: sinRayas(a.resumen),
  };
}
