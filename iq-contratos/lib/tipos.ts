// Catálogos compartidos entre la base de datos, el servidor y la interfaz.

export type Rol = "abogado" | "director_juridico" | "negocio";
export type EstadoContrato = "recibido" | "en_revision" | "en_negociacion" | "aprobado" | "firmado";
export type Riesgo = "alto" | "medio" | "bajo";
export type EstadoHallazgo = "pendiente" | "aceptado" | "editado" | "descartado";
export type TipoContrato =
  | "suministro"
  | "prestacion_servicios"
  | "obra"
  | "arrendamiento"
  | "confidencialidad"
  | "compraventa"
  | "otro";

export const ROLES: Record<Rol, string> = {
  abogado: "Abogado",
  director_juridico: "Director jurídico",
  negocio: "Negocio",
};

export const ESTADOS: Record<EstadoContrato, string> = {
  recibido: "Recibido",
  en_revision: "En revisión",
  en_negociacion: "En negociación",
  aprobado: "Aprobado",
  firmado: "Firmado",
};
export const ORDEN_ESTADOS: EstadoContrato[] = ["recibido", "en_revision", "en_negociacion", "aprobado", "firmado"];

export const TIPOS_CONTRATO: Record<TipoContrato, string> = {
  suministro: "Suministro",
  prestacion_servicios: "Prestación de servicios",
  obra: "Obra",
  arrendamiento: "Arrendamiento",
  confidencialidad: "Confidencialidad",
  compraventa: "Compraventa",
  otro: "Otro",
};

export const RIESGOS: Record<Riesgo, string> = { alto: "Alto", medio: "Medio", bajo: "Bajo" };

export const ESTADOS_HALLAZGO: Record<EstadoHallazgo, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  editado: "Editado",
  descartado: "Descartado",
};

export interface Usuario {
  id: string;
  org_id: string;
  nombre: string;
  puesto: string | null;
  rol: Rol;
  correo: string;
}

export const permisos = {
  validar: (rol: Rol) => rol === "abogado" || rol === "director_juridico",
  editarPlaybook: (rol: Rol) => rol === "director_juridico",
  verReportes: (rol: Rol) => rol === "director_juridico",
  cambiarEstado: (rol: Rol) => rol === "abogado" || rol === "director_juridico",
};
