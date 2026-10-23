import { fecha, fechaHora } from "@/lib/formato";
import { ESTADOS, ESTADOS_HALLAZGO, type EstadoContrato, type EstadoHallazgo } from "@/lib/tipos";

export type Evento = { id: number; accion: string; detalle: Record<string, unknown>; actor_id: string | null; creado_en: string };

function plural(n: unknown, uno: string, varios: string): string {
  const v = Number(n ?? 0);
  return `${v} ${v === 1 ? uno : varios}`;
}

export function describir(e: Evento): string {
  const d = e.detalle ?? {};
  switch (e.accion) {
    case "contrato_subido":
      return `Subió el contrato: ${plural(d.clausulas, "cláusula", "cláusulas")}, ${plural(d.declaraciones, "declaración", "declaraciones")}, ${plural(d.paginas ?? 1, "página", "páginas")}.`;
    case "contrato_generado":
      return `Generó el contrato desde la plantilla: ${plural(d.clausulas, "cláusula", "cláusulas")}, ${plural(d.declaraciones, "declaración", "declaraciones")}.`;
    case "expediente_vinculado":
      return d.expediente
        ? `Vinculó el expediente corporativo de ${d.parte === "propia" ? "la empresa" : "la contraparte"}.`
        : `Desvinculó el expediente corporativo de ${d.parte === "propia" ? "la empresa" : "la contraparte"}.`;
    case "version_agregada":
      return `Agregó la versión ${d.version}.`;
    case "estado_cambiado":
      return `Cambió el estado de ${ESTADOS[d.de as EstadoContrato] ?? d.de} a ${ESTADOS[d.a as EstadoContrato] ?? d.a}.`;
    case "analisis_completado":
      return `Análisis de IA completado: ${plural(d.hallazgos, "hallazgo", "hallazgos")}${d.corporativos ? `, ${plural(d.corporativos, "sobre datos corporativos", "sobre datos corporativos")}` : ""}${d.descartados ? `; ${plural(d.descartados, "omitido", "omitidos")} por no encontrar la cita exacta` : ""}.`;
    case "analisis_fallido":
      return "El análisis de IA no se pudo completar.";
    case "comentario":
      return d.audiencia === "negocio" ? "Agregó un comentario para el área de negocio." : "Agregó un comentario del equipo legal.";
    case "contrapropuesta_generada":
      return `Generó la contrapropuesta en Word con ${plural(d.cambios, "cambio", "cambios")} en control de cambios.`;
    case "firma_enviada":
      return `Envió el contrato a firma electrónica con Mifiel (${plural(d.firmantes, "firmante", "firmantes")}).`;
    case "firma_completada":
      return "Mifiel confirmó todas las firmas; se guardaron el PDF firmado y la constancia NOM-151.";
    case "ficha_extraida":
      return `La IA llenó la ficha del contrato (${plural(d.campos, "dato", "datos")}).`;
    case "ficha_confirmada":
      return d.cambios ? `Editó y confirmó la ficha del contrato (${plural(d.cambios, "dato cambiado", "datos cambiados")}).` : "Confirmó la ficha del contrato.";
    case "responsable_asignado":
      return d.responsable ? "Asignó al abogado responsable del contrato." : "Quitó al abogado responsable del contrato.";
    case "contrato_terminado":
      return `Registró la terminación del contrato con fecha ${typeof d.fecha === "string" ? fecha(d.fecha) : ""}.`;
    case "terminacion_revertida":
      return "Revirtió la terminación del contrato.";
    case "firma_rechazada":
      return "Un firmante rechazó la firma en Mifiel.";
    case "datos_actualizados":
      return "Actualizó los datos generales del contrato.";
    default:
      if (e.accion.startsWith("hallazgo_")) {
        const estado = e.accion.replace("hallazgo_", "") as EstadoHallazgo;
        return `Marcó el hallazgo ${d.hallazgo} (${d.clausula}, ${d.tema}) como ${ESTADOS_HALLAZGO[estado]?.toLowerCase() ?? estado}.`;
      }
      return e.accion;
  }
}

export function Historial({ eventos, perfiles }: { eventos: Evento[]; perfiles: Record<string, { nombre: string }> }) {
  if (eventos.length === 0) return <p className="text-[13.5px] text-secundario">Sin movimientos registrados.</p>;
  return (
    <ol className="relative space-y-4 border-l border-linea pl-5">
      {eventos.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-linea-fuerte" aria-hidden />
          <p className="text-[13.5px]">
            <span className="font-medium">{e.actor_id ? perfiles[e.actor_id]?.nombre ?? "Usuario" : "Sistema"}</span>{" "}
            <span className="text-secundario">{describir(e)}</span>
          </p>
          <p className="text-[12px] text-secundario">{fechaHora(e.creado_en)}</p>
        </li>
      ))}
    </ol>
  );
}
