// Campos del expediente corporativo de una parte. Son los datos que un contrato mexicano
// declara sobre cada parte: constitución, representación, datos fiscales y domicilio.
// Se usan para extraer datos de los documentos, verificar las declaraciones del contrato
// y llenar las plantillas.

export type TipoPersona = "moral" | "fisica";
export type TipoDocumento =
  | "acta_constitutiva"
  | "reforma_estatutos"
  | "poder"
  | "constancia_fiscal"
  | "identificacion"
  | "comprobante_domicilio"
  | "otro";

export const TIPOS_DOCUMENTO: Record<TipoDocumento, string> = {
  acta_constitutiva: "Acta constitutiva",
  reforma_estatutos: "Reforma de estatutos",
  poder: "Poder del representante",
  constancia_fiscal: "Constancia de situación fiscal",
  identificacion: "Identificación oficial",
  comprobante_domicilio: "Comprobante de domicilio",
  otro: "Otro documento",
};

export const CLAVES_CAMPO = [
  "nacionalidad",
  "constitucion_escritura",
  "constitucion_fecha",
  "constitucion_notario",
  "constitucion_notaria",
  "constitucion_lugar",
  "folio_mercantil",
  "objeto_social",
  "representante_nombre",
  "representante_cargo",
  "poder_escritura",
  "poder_fecha",
  "poder_notario",
  "poder_notaria",
  "poder_lugar",
  "poder_facultades",
  "identificacion",
  "domicilio_fiscal",
  "domicilio",
  "correo_notificaciones",
] as const;
export type ClaveCampo = (typeof CLAVES_CAMPO)[number];

export interface Campo {
  clave: ClaveCampo;
  etiqueta: string;
  grupo: "Constitución" | "Representación" | "Datos fiscales y domicilio";
  tipo: "texto" | "fecha" | "largo";
  personas: TipoPersona[];
  // Documentos que son fuente primaria del dato: si uno de ellos lo trae, prevalece.
  fuentes: TipoDocumento[];
  // Si se indica, el dato solo se toma de estos documentos. El domicilio de un acta es la
  // ciudad del domicilio social, no una dirección para notificaciones.
  soloDe?: TipoDocumento[];
  ayuda?: string;
}

const M: TipoPersona[] = ["moral"];
const AMBAS: TipoPersona[] = ["moral", "fisica"];

export const CAMPOS: Campo[] = [
  { clave: "nacionalidad", etiqueta: "Nacionalidad", grupo: "Constitución", tipo: "texto", personas: AMBAS, fuentes: ["acta_constitutiva", "identificacion"] },
  { clave: "constitucion_escritura", etiqueta: "Escritura constitutiva (número)", grupo: "Constitución", tipo: "texto", personas: M, fuentes: ["acta_constitutiva"] },
  { clave: "constitucion_fecha", etiqueta: "Fecha de la escritura constitutiva", grupo: "Constitución", tipo: "fecha", personas: M, fuentes: ["acta_constitutiva"] },
  { clave: "constitucion_notario", etiqueta: "Notario que la otorgó", grupo: "Constitución", tipo: "texto", personas: M, fuentes: ["acta_constitutiva"] },
  { clave: "constitucion_notaria", etiqueta: "Número de notaría", grupo: "Constitución", tipo: "texto", personas: M, fuentes: ["acta_constitutiva"] },
  { clave: "constitucion_lugar", etiqueta: "Lugar de la notaría", grupo: "Constitución", tipo: "texto", personas: M, fuentes: ["acta_constitutiva"] },
  {
    clave: "folio_mercantil",
    etiqueta: "Folio mercantil electrónico",
    grupo: "Constitución",
    tipo: "texto",
    personas: M,
    fuentes: ["acta_constitutiva", "reforma_estatutos"],
    ayuda: "Datos de inscripción en el Registro Público de Comercio.",
  },
  { clave: "objeto_social", etiqueta: "Objeto social (resumen)", grupo: "Constitución", tipo: "largo", personas: M, fuentes: ["acta_constitutiva", "reforma_estatutos"] },
  { clave: "representante_nombre", etiqueta: "Representante legal", grupo: "Representación", tipo: "texto", personas: M, fuentes: ["poder", "acta_constitutiva"] },
  { clave: "representante_cargo", etiqueta: "Cargo del representante", grupo: "Representación", tipo: "texto", personas: M, fuentes: ["poder", "acta_constitutiva"] },
  { clave: "poder_escritura", etiqueta: "Escritura del poder (número)", grupo: "Representación", tipo: "texto", personas: M, fuentes: ["poder"] },
  { clave: "poder_fecha", etiqueta: "Fecha de la escritura del poder", grupo: "Representación", tipo: "fecha", personas: M, fuentes: ["poder"] },
  { clave: "poder_notario", etiqueta: "Notario del poder", grupo: "Representación", tipo: "texto", personas: M, fuentes: ["poder"] },
  { clave: "poder_notaria", etiqueta: "Número de notaría del poder", grupo: "Representación", tipo: "texto", personas: M, fuentes: ["poder"] },
  { clave: "poder_lugar", etiqueta: "Lugar de la notaría del poder", grupo: "Representación", tipo: "texto", personas: M, fuentes: ["poder"] },
  {
    clave: "poder_facultades",
    etiqueta: "Facultades otorgadas",
    grupo: "Representación",
    tipo: "largo",
    personas: M,
    fuentes: ["poder", "acta_constitutiva"],
    ayuda: "Tal como las describe el instrumento (por ejemplo, actos de administración, pleitos y cobranzas, títulos de crédito).",
  },
  { clave: "identificacion", etiqueta: "Identificación oficial", grupo: "Representación", tipo: "texto", personas: AMBAS, fuentes: ["identificacion"], ayuda: "Tipo de identificación y su número o folio." },
  { clave: "domicilio_fiscal", etiqueta: "Domicilio fiscal", grupo: "Datos fiscales y domicilio", tipo: "texto", personas: AMBAS, fuentes: ["constancia_fiscal"], soloDe: ["constancia_fiscal"] },
  {
    clave: "domicilio",
    etiqueta: "Domicilio para efectos del contrato",
    grupo: "Datos fiscales y domicilio",
    tipo: "texto",
    personas: AMBAS,
    fuentes: ["comprobante_domicilio", "constancia_fiscal"],
    soloDe: ["comprobante_domicilio", "constancia_fiscal"],
  },
  { clave: "correo_notificaciones", etiqueta: "Correo para notificaciones", grupo: "Datos fiscales y domicilio", tipo: "texto", personas: AMBAS, fuentes: [] },
];

export const CAMPO = Object.fromEntries(CAMPOS.map((c) => [c.clave, c])) as Record<ClaveCampo, Campo>;

export function camposDe(tipo: TipoPersona): Campo[] {
  return CAMPOS.filter((c) => c.personas.includes(tipo));
}

// Documentos que normalmente integran el expediente de cada tipo de persona.
export const DOCUMENTOS_REQUERIDOS: Record<TipoPersona, TipoDocumento[]> = {
  moral: ["acta_constitutiva", "poder", "constancia_fiscal", "identificacion", "comprobante_domicilio"],
  fisica: ["identificacion", "constancia_fiscal", "comprobante_domicilio"],
};

export type DatosExpediente = Partial<Record<ClaveCampo, string>>;
export interface Fuente {
  documento_id: string;
  tipo: TipoDocumento;
  cita: string | null;
  pagina: number | null;
}
export type FuentesExpediente = Partial<Record<ClaveCampo, Fuente>>;

export interface Expediente {
  id: string;
  denominacion: string;
  rfc: string | null;
  tipo_persona: TipoPersona;
  es_propia: boolean;
  estado: "por_validar" | "validado";
  datos: DatosExpediente;
}

// Formato del RFC: 3 letras (persona moral) o 4 (persona física), fecha AAMMDD y homoclave.
export function rfcValido(rfc: string, tipo?: TipoPersona): boolean {
  const r = rfc.trim().toUpperCase();
  const moral = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/.test(r);
  const fisica = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/.test(r);
  if (!(moral || fisica)) return false;
  if (tipo === "moral" && !moral) return false;
  if (tipo === "fisica" && !fisica) return false;
  const fecha = r.slice(r.length - 9, r.length - 3);
  const mes = Number(fecha.slice(2, 4));
  const dia = Number(fecha.slice(4, 6));
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31;
}

// Clave para comparar denominaciones sin acentos, puntuación ni el tipo societario.
export function claveDenominacion(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[.,;:"'“”«»()]/g, " ")
    .replace(/\b(S\s*A\s*P\s*I|S\s*A\s*B|S\s*A|S\s*DE\s*R\s*L|S\s*C|S\s*A\s*S|A\s*C)\b(\s*DE\s*C\s*V)?/g, " ")
    .replace(/\bDE\s*C\s*V\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function camposFaltantes(e: Pick<Expediente, "tipo_persona" | "datos" | "rfc">): Campo[] {
  return camposDe(e.tipo_persona).filter((c) => c.clave !== "correo_notificaciones" && !e.datos[c.clave]?.trim());
}

// Integra los datos extraídos de un documento al expediente. Un documento que es fuente
// primaria de un dato lo reemplaza; cualquier otro solo llena datos vacíos. Regresa
// también las diferencias encontradas, para mostrarlas a Legal.
export function integrarDatos(p: {
  datos: DatosExpediente;
  fuentes: FuentesExpediente;
  documento: { id: string; tipo: TipoDocumento };
  extraidos: { clave: ClaveCampo; valor: string; cita: string | null; pagina: number | null }[];
}): {
  datos: DatosExpediente;
  fuentes: FuentesExpediente;
  cambios: ClaveCampo[];
  diferencias: { clave: ClaveCampo; anterior: string; nuevo: string; reemplazado: boolean }[];
} {
  const datos = { ...p.datos };
  const fuentes = { ...p.fuentes };
  const cambios: ClaveCampo[] = [];
  const diferencias: { clave: ClaveCampo; anterior: string; nuevo: string; reemplazado: boolean }[] = [];
  for (const e of p.extraidos) {
    const campo = CAMPO[e.clave];
    const valor = e.valor.trim();
    if (!campo || !valor) continue;
    if (campo.soloDe && !campo.soloDe.includes(p.documento.tipo)) continue;
    const anterior = datos[e.clave]?.trim() ?? "";
    const fuente: Fuente = { documento_id: p.documento.id, tipo: p.documento.tipo, cita: e.cita?.trim() || null, pagina: e.pagina };
    if (!anterior) {
      datos[e.clave] = valor;
      fuentes[e.clave] = fuente;
      cambios.push(e.clave);
      continue;
    }
    if (comparable(anterior) === comparable(valor)) continue;
    const primaria = campo.fuentes.includes(p.documento.tipo);
    diferencias.push({ clave: e.clave, anterior, nuevo: valor, reemplazado: primaria });
    if (primaria) {
      datos[e.clave] = valor;
      fuentes[e.clave] = fuente;
      cambios.push(e.clave);
    }
  }
  return { datos, fuentes, cambios, diferencias };
}

export function comparable(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9@]/g, "");
}
