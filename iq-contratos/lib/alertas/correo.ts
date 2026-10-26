import "server-only";
import { fechaLarga } from "@/lib/fechas/calcular";

// Contenido del aviso por correo. El envío queda preparado pero desactivado en la demo
// (ALERTAS_CORREO_ACTIVAS=false). Para producción, conectar aquí un proveedor de correo
// transaccional; el texto nunca incluye contenido del contrato, solo datos de la alerta.
export interface AvisoCorreo {
  para: string;
  asunto: string;
  cuerpo: string;
}

export function redactarAviso(p: { area: string; correo: string; titulo: string; contrato: string; contraparte: string; fechaLimite: string; dias: number; enlace: string }): AvisoCorreo {
  return {
    para: p.correo,
    asunto: `${p.titulo}: ${p.contrato} (${p.dias} día${p.dias === 1 ? "" : "s"})`,
    cuerpo: [
      `Área ${p.area}:`,
      "",
      `El contrato "${p.contrato}" con ${p.contraparte} tiene la siguiente fecha límite: ${p.titulo.toLowerCase()} el ${fechaLarga(p.fechaLimite)}.`,
      "",
      `Revise el detalle en Qlaro: ${p.enlace}`,
      "",
      "Este aviso es automático. La decisión sobre el contrato corresponde a la dirección legal.",
    ].join("\n"),
  };
}

export async function enviarAviso(_aviso: AvisoCorreo): Promise<void> {
  throw new Error("El envío de correo no está configurado en esta versión.");
}
