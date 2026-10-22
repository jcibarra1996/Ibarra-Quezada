// Llena una plantilla con los expedientes de las partes y los datos del negocio.
// Es una función pura: lo que falte queda marcado como [PENDIENTE: ...] en el texto
// y se reporta, para que nadie firme un contrato con huecos sin darse cuenta.
//
// Marcadores:
//   {{rol.campo}}          dato del expediente (denominacion, rfc o un campo de lib/corporativo/campos)
//   {{rol.termino}}        término definido ("EL CLIENTE")
//   {{rol.proemio}}        "DENOMINACIÓN, REPRESENTADA EN ESTE ACTO POR NOMBRE"
//   {{rol.comparecencia}}  "por conducto de su representante legal" o "por su propio derecho"
//   {{rol.declaraciones}}  incisos de declaraciones con los datos corporativos
//   {{negocio.clave}}      dato de la solicitud, con el formato de su tipo
//   {{firmas}}, {{lugar_firma}}, {{fecha_firma}}

import { CAMPO, type ClaveCampo, type DatosExpediente, type TipoPersona } from "@/lib/corporativo/campos";
import { cantidadConLetra, fechaLarga, importeConLetra, leerImporte } from "./numeros";

export interface RolPlantilla {
  clave: string;
  termino: string;
  etiqueta: string;
  // La parte que corresponde a la empresa que usa la herramienta.
  propia: boolean;
  declaraciones?: string[];
}

export interface CampoNegocio {
  clave: string;
  etiqueta: string;
  tipo: "texto" | "largo" | "importe" | "fecha" | "entero";
  unidad?: [string, string];
  ayuda?: string;
  requerido?: boolean;
  predeterminado?: string;
}

export interface ParteLlenado {
  denominacion: string;
  rfc: string | null;
  tipo_persona: TipoPersona;
  datos: DatosExpediente;
}

export interface Llenado {
  texto: string;
  faltantes: string[];
}

const LETRAS = "abcdefghijklmnopqrstuvwxyz";
// "Precio total (antes de IVA)" -> "precio total (antes de IVA)": respeta siglas.
const enMinuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function llenarPlantilla(p: {
  cuerpo: string;
  roles: RolPlantilla[];
  campos: CampoNegocio[];
  partes: Record<string, ParteLlenado | null>;
  negocio: Record<string, string>;
  lugarFirma: string;
  fechaFirma: string | null;
}): Llenado {
  const faltantes = new Set<string>();
  const pendiente = (que: string) => {
    faltantes.add(que);
    return `[PENDIENTE: ${que}]`;
  };

  const dato = (rol: RolPlantilla, campo: string): string => {
    const parte = p.partes[rol.clave];
    if (!parte) return pendiente(`expediente de ${rol.termino}`);
    if (campo === "denominacion") return parte.denominacion;
    if (campo === "rfc") return parte.rfc ?? pendiente(`RFC de ${rol.termino}`);
    const def = CAMPO[campo as ClaveCampo];
    if (!def) return pendiente(campo);
    const v = parte.datos[campo as ClaveCampo]?.trim();
    if (!v) return pendiente(`${enMinuscula(def.etiqueta)} de ${rol.termino}`);
    return def.tipo === "fecha" ? fechaLarga(v) : v;
  };

  const proemio = (rol: RolPlantilla): string => {
    const parte = p.partes[rol.clave];
    if (!parte) return pendiente(`expediente de ${rol.termino}`);
    if (parte.tipo_persona === "fisica") return `${parte.denominacion.toUpperCase()}, POR SU PROPIO DERECHO`;
    return `${parte.denominacion.toUpperCase()}, REPRESENTADA EN ESTE ACTO POR ${dato(rol, "representante_nombre").toUpperCase()}`;
  };

  const declaraciones = (rol: RolPlantilla): string => {
    const parte = p.partes[rol.clave];
    const d = (campo: string) => dato(rol, campo);
    const incisos: string[] = [];
    if (!parte) {
      incisos.push(pendiente(`expediente de ${rol.termino}`));
    } else if (parte.tipo_persona === "fisica") {
      incisos.push(
        `Es una persona física de nacionalidad ${parte.datos.nacionalidad?.trim() || "mexicana"}, con capacidad legal para obligarse en los términos del presente contrato, y se identifica con ${d("identificacion")}.`,
      );
      incisos.push(`Se encuentra inscrita en el Registro Federal de Contribuyentes con la clave ${d("rfc")}.`);
      incisos.push(`Señala como domicilio para efectos del presente contrato el ubicado en ${d("domicilio")}.`);
    } else {
      incisos.push(
        `Es una sociedad legalmente constituida conforme a las leyes de los Estados Unidos Mexicanos, según consta en la escritura pública número ${d("constitucion_escritura")}, de fecha ${d("constitucion_fecha")}, otorgada ante la fe de ${d("constitucion_notario")}, titular de la Notaría Pública número ${d("constitucion_notaria")} de ${d("constitucion_lugar")}, inscrita en el Registro Público de Comercio bajo el folio mercantil electrónico ${d("folio_mercantil")}.`,
      );
      incisos.push(
        `Su representante legal, ${d("representante_nombre")}, cuenta con las facultades necesarias para celebrar el presente contrato y obligarla en sus términos, según consta en la escritura pública número ${d("poder_escritura")}, de fecha ${d("poder_fecha")}, otorgada ante la fe de ${d("poder_notario")}, titular de la Notaría Pública número ${d("poder_notaria")} de ${d("poder_lugar")}, facultades que a la fecha no le han sido revocadas, modificadas ni limitadas en forma alguna.`,
      );
      incisos.push(`Se encuentra inscrita en el Registro Federal de Contribuyentes con la clave ${d("rfc")}.`);
      if (parte.datos.objeto_social?.trim()) incisos.push(`Su objeto social comprende, entre otras actividades, ${parte.datos.objeto_social.trim().replace(/\.$/, "")}.`);
      incisos.push(`Señala como domicilio para efectos del presente contrato el ubicado en ${d("domicilio")}.`);
    }
    for (const extra of rol.declaraciones ?? []) incisos.push(reemplazar(extra));
    return incisos.map((t, i) => `${LETRAS[i]}) ${t}`).join("\n\n");
  };

  const negocio = (clave: string): string => {
    const def = p.campos.find((c) => c.clave === clave);
    const v = (p.negocio[clave] ?? def?.predeterminado ?? "").trim();
    const etiqueta = def ? enMinuscula(def.etiqueta) : clave;
    if (!v) return pendiente(etiqueta);
    switch (def?.tipo) {
      case "importe": {
        const n = leerImporte(v);
        return n === null ? pendiente(etiqueta) : importeConLetra(n);
      }
      case "fecha":
        return /^\d{4}-\d{2}-\d{2}$/.test(v) ? fechaLarga(v) : pendiente(etiqueta);
      case "entero": {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 0) return pendiente(etiqueta);
        const [uno, varios] = def.unidad ?? ["", ""];
        return uno ? cantidadConLetra(n, uno, varios) : String(n);
      }
      default:
        return v.replace(/\.$/, "");
    }
  };

  const firmas = (): string =>
    p.roles
      .map((rol) => {
        const parte = p.partes[rol.clave];
        const firmante = parte?.tipo_persona === "fisica" ? parte.denominacion : dato(rol, "representante_nombre");
        const cargo = parte?.tipo_persona === "fisica" ? "Por su propio derecho" : "Representante legal";
        return [rol.termino, parte?.denominacion.toUpperCase() ?? "", "", "______________________________", firmante, cargo].filter((l, i) => i !== 1 || l).join("\n");
      })
      .join("\n\n");

  function reemplazar(texto: string): string {
    return texto.replace(/\{\{\s*([a-z_]+)(?:\.([a-z_]+))?\s*\}\}/g, (_m, a: string, b?: string) => {
      if (a === "firmas") return firmas();
      if (a === "lugar_firma") return p.lugarFirma.trim() || pendiente("lugar de firma");
      if (a === "fecha_firma") return p.fechaFirma ? fechaLarga(p.fechaFirma) : pendiente("fecha de firma");
      if (a === "negocio" && b) return negocio(b);
      const rol = p.roles.find((r) => r.clave === a);
      if (!rol || !b) return pendiente(`marcador ${a}${b ? `.${b}` : ""}`);
      if (b === "termino") return rol.termino;
      if (b === "proemio") return proemio(rol);
      if (b === "comparecencia") return p.partes[rol.clave]?.tipo_persona === "fisica" ? "por su propio derecho" : "por conducto de su representante legal";
      if (b === "declaraciones") return declaraciones(rol);
      return dato(rol, b);
    });
  }

  return { texto: reemplazar(p.cuerpo).replace(/\n{3,}/g, "\n\n").trim() + "\n", faltantes: [...faltantes] };
}

// Marcadores de datos del negocio que usa una plantilla, para validar su definición.
export function marcadoresNegocio(cuerpo: string, roles: RolPlantilla[]): string[] {
  const texto = [cuerpo, ...roles.flatMap((r) => r.declaraciones ?? [])].join("\n");
  return [...new Set([...texto.matchAll(/\{\{\s*negocio\.([a-z_]+)\s*\}\}/g)].map((m) => m[1]))];
}
