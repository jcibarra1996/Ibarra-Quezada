import Link from "next/link";
import { ESTADOS, ORDEN_ESTADOS, type EstadoContrato } from "@/lib/tipos";
import { fecha } from "@/lib/formato";

const MENSAJE: Record<EstadoContrato, string> = {
  recibido: "Legal recibió su solicitud. La primera lectura empieza en breve.",
  en_revision: "Legal está revisando el contrato. Si necesita algo de usted, se lo pedirá en Comentarios.",
  en_negociacion: "Legal está negociando cambios con la contraparte.",
  aprobado: "Legal aprobó el contrato. Sigue la firma de las partes.",
  firmado: "El contrato está firmado. Los plazos y vencimientos quedan en seguimiento.",
};

// Lo que ve el área de negocio en lugar del análisis de la IA: en qué va su solicitud.
export function PanelSolicitud({
  contratoId,
  estado,
  recibido,
  firmaEnCurso,
  comentariosLegal,
}: {
  contratoId: string;
  estado: EstadoContrato;
  recibido: string;
  firmaEnCurso: boolean;
  comentariosLegal: number;
}) {
  const actual = ORDEN_ESTADOS.indexOf(estado);
  return (
    <div className="space-y-5 p-5">
      <section className="rounded-lg bg-crema px-4 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-terracota-oscuro">Estado de su solicitud</p>
        <p className="mt-1 text-[15px] font-semibold">{ESTADOS[estado]}</p>
        <p className="mt-1 text-[13px] leading-relaxed">{firmaEnCurso && estado === "aprobado" ? "El contrato está en firma electrónica con Mifiel." : MENSAJE[estado]}</p>
      </section>
      <ol className="space-y-0">
        {ORDEN_ESTADOS.map((e, i) => {
          const hecho = i < actual || estado === "firmado";
          const ahora = i === actual && estado !== "firmado";
          return (
            <li key={e} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                    hecho ? "bg-bajo text-white" : ahora ? "bg-terracota text-white" : "border border-linea-fuerte bg-white text-secundario"
                  }`}
                >
                  {hecho ? "✓" : i + 1}
                </span>
                {i < ORDEN_ESTADOS.length - 1 && <span className={`w-px flex-1 ${hecho ? "bg-bajo" : "bg-linea"}`} style={{ minHeight: 18 }} />}
              </div>
              <p className={`pb-4 text-[13.5px] ${ahora ? "font-semibold" : hecho ? "" : "text-secundario"}`}>
                {ESTADOS[e]}
                {e === "recibido" && <span className="block text-[12px] font-normal text-secundario">{fecha(recibido)}</span>}
              </p>
            </li>
          );
        })}
      </ol>
      <div className="rounded-lg border border-linea p-4">
        <p className="text-[13px] font-medium">¿Dudas sobre su contrato?</p>
        <p className="mt-1 text-[12.5px] text-secundario">
          {comentariosLegal > 0 ? `Legal le dejó ${comentariosLegal} ${comentariosLegal === 1 ? "mensaje" : "mensajes"}. ` : ""}
          Escriba a Legal desde Comentarios.
        </p>
        <Link href={`/contratos/${contratoId}?pestana=comentarios`} className="mt-2 inline-block text-[13px] font-medium text-terracota hover:underline">
          Ir a Comentarios
        </Link>
      </div>
      <p className="text-[12px] leading-relaxed text-secundario">La revisión del contrato y sus observaciones son trabajo interno de Legal.</p>
    </div>
  );
}
