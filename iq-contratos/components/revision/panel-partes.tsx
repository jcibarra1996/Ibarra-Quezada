import Link from "next/link";
import { EtiquetaValidacion } from "@/components/expedientes/etiqueta-validacion";
import { SubirDocumento } from "@/components/expedientes/subir-documento";
import { SelectorExpediente } from "./selector-expediente";
import { CAMPO, camposFaltantes, DOCUMENTOS_REQUERIDOS, TIPOS_DOCUMENTO, type DatosExpediente, type TipoPersona } from "@/lib/corporativo/campos";

export interface ExpedienteParte {
  id: string;
  denominacion: string;
  rfc: string | null;
  tipo_persona: string;
  estado: string;
  datos: unknown;
  documentos: string[];
}

function Tarjeta({
  titulo,
  parte,
  contratoId,
  expediente,
  opciones,
  editable,
  sugerencia,
}: {
  titulo: string;
  parte: "propia" | "contraparte";
  contratoId: string;
  expediente: ExpedienteParte | null;
  opciones: { id: string; denominacion: string }[];
  editable: boolean;
  sugerencia: string;
}) {
  const tipo = (expediente?.tipo_persona === "fisica" ? "fisica" : "moral") as TipoPersona;
  const faltan = expediente ? camposFaltantes({ tipo_persona: tipo, datos: expediente.datos as DatosExpediente, rfc: expediente.rfc }) : [];
  const tiene = new Set(expediente?.documentos ?? []);
  return (
    <section className="rounded-lg border border-linea bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-secundario">{titulo}</p>
      {expediente ? (
        <>
          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/expedientes/${expediente.id}`} className="text-[15px] font-semibold hover:text-mandarina-texto">
                {expediente.denominacion}
              </Link>
              <p className="font-mono text-[12px] text-secundario">{expediente.rfc ?? "Sin RFC"}</p>
            </div>
            <EtiquetaValidacion estado={expediente.estado} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-secundario">Documentos</p>
              <ul className="space-y-1">
                {DOCUMENTOS_REQUERIDOS[tipo].map((t) => (
                  <li key={t} className={`text-[12.5px] ${tiene.has(t) ? "" : "text-secundario"}`}>
                    {tiene.has(t) ? "Cargado: " : "Falta: "}
                    {TIPOS_DOCUMENTO[t]}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-secundario">Datos por completar</p>
              {faltan.length === 0 && expediente.rfc ? (
                <p className="text-[12.5px] text-bajo">El expediente tiene todos los datos.</p>
              ) : (
                <ul className="space-y-1">
                  {!expediente.rfc && <li className="text-[12.5px]">RFC</li>}
                  {faltan.slice(0, 6).map((c) => (
                    <li key={c.clave} className="text-[12.5px]">
                      {CAMPO[c.clave].etiqueta}
                    </li>
                  ))}
                  {faltan.length > 6 && <li className="text-[12.5px] text-secundario">y {faltan.length - 6} más</li>}
                </ul>
              )}
            </div>
          </div>
          {editable && parte === "contraparte" && (
            <div className="mt-4">
              <SubirDocumento expedienteId={expediente.id} />
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 text-[13px] text-secundario">{sugerencia}</p>
      )}
      {editable && (
        <div className="mt-4 border-t border-linea pt-3">
          <SelectorExpediente contratoId={contratoId} parte={parte} actual={expediente?.id ?? null} opciones={opciones} />
        </div>
      )}
    </section>
  );
}

export function PanelPartes(p: {
  contratoId: string;
  contraparteNombre: string;
  propia: ExpedienteParte | null;
  contraparte: ExpedienteParte | null;
  opciones: { id: string; denominacion: string; es_propia: boolean }[];
  editable: boolean;
  // null: quien consulta no ve el análisis de la IA (área de negocio).
  hallazgosCorporativos: number | null;
}) {
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-[13px] leading-relaxed text-secundario">
        Al analizar el contrato, la IA compara las declaraciones de cada parte con su expediente corporativo y propone corregir o agregar los datos que no coincidan
        (denominación, escritura constitutiva, representante y poder, RFC, domicilio). Las propuestas aparecen como hallazgos y Legal decide cada una.
        {p.hallazgosCorporativos !== null && p.hallazgosCorporativos > 0 && ` El análisis vigente tiene ${p.hallazgosCorporativos} ${p.hallazgosCorporativos === 1 ? "hallazgo" : "hallazgos"} sobre datos corporativos.`}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Tarjeta
          titulo="La empresa"
          parte="propia"
          contratoId={p.contratoId}
          expediente={p.propia}
          opciones={p.opciones.filter((o) => o.es_propia)}
          editable={p.editable}
          sugerencia="No hay expediente de la empresa vinculado."
        />
        <Tarjeta
          titulo="Contraparte"
          parte="contraparte"
          contratoId={p.contratoId}
          expediente={p.contraparte}
          opciones={p.opciones.filter((o) => !o.es_propia)}
          editable={p.editable}
          sugerencia={`No hay expediente vinculado${p.contraparteNombre ? ` para ${p.contraparteNombre}` : ""}. Seleccione uno o cree el expediente y cargue sus documentos corporativos.`}
        />
      </div>
    </div>
  );
}
