import { CAMPO, camposDe, camposFaltantes, TIPOS_DOCUMENTO, type DatosExpediente, type FuentesExpediente, type TipoPersona } from "./campos";
import type { ExpedientePrompt } from "@/lib/ai/prompt";

export interface FilaExpediente {
  id: string;
  denominacion: string;
  rfc: string | null;
  tipo_persona: string;
  estado: string;
  datos: unknown;
  fuentes: unknown;
}

// Convierte un expediente en el bloque que recibe el modelo: datos con su documento fuente
// y la lista de datos que faltan, para que no los invente.
export function expedienteParaPrompt(e: FilaExpediente, papel: ExpedientePrompt["papel"]): ExpedientePrompt {
  const tipo = (e.tipo_persona === "fisica" ? "fisica" : "moral") as TipoPersona;
  const datos = (e.datos ?? {}) as DatosExpediente;
  const fuentes = (e.fuentes ?? {}) as FuentesExpediente;
  return {
    papel,
    denominacion: e.denominacion,
    rfc: e.rfc,
    validado: e.estado === "validado",
    datos: camposDe(tipo)
      .filter((c) => datos[c.clave]?.trim())
      .map((c) => {
        const f = fuentes[c.clave];
        return { etiqueta: c.etiqueta, valor: datos[c.clave]!.trim(), fuente: f ? `${TIPOS_DOCUMENTO[f.tipo]}${f.pagina ? `, página ${f.pagina}` : ""}` : "capturado por el equipo" };
      }),
    faltantes: camposFaltantes({ tipo_persona: tipo, datos, rfc: e.rfc }).map((c) => CAMPO[c.clave].etiqueta),
  };
}
