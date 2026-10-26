import Link from "next/link";
import type { ReactNode } from "react";
import { EtiquetaEstado, EtiquetaVigencia } from "@/components/ui/etiquetas";
import { dinero, fecha, fechaHora } from "@/lib/formato";
import { diasEntre } from "@/lib/fechas/avisos";
import { ESTADOS, TIPOS_CONTRATO, type EstadoContrato, type TipoContrato } from "@/lib/tipos";
import { valorAnual, type Vigencia } from "@/lib/vigencia";
import type { CampoFicha, FuentesFicha } from "@/lib/ai/ficha-esquema";
import { ConfirmarFicha, LlenarConIA, SelectorResponsable, TerminosEditables, Terminacion, type ValoresFormulario } from "./controles";

export interface ContratoFicha {
  id: string;
  estado: string;
  tipo_contrato: string | null;
  objeto: string | null;
  contraparte: string;
  recibido_en: string;
  aprobado_en: string | null;
  firmado_en: string | null;
  monto: number | string | null;
  moneda: string | null;
  monto_periodo: string | null;
  inicio_vigencia: string | null;
  fin_vigencia: string | null;
  duracion_meses: number | null;
  renovacion_automatica: boolean | null;
  renovacion_meses: number | null;
  aviso_dias: number | null;
  aviso_habiles: boolean;
  ley_aplicable: string | null;
  jurisdiccion: string | null;
  responsable_id: string | null;
  terminado_en: string | null;
  motivo_terminacion: string | null;
  ficha_fuentes: FuentesFicha | null;
  ficha_confirmada_en: string | null;
  ficha_confirmada_por: string | null;
}

const PERIODO: Record<string, string> = { total: "total del contrato", mensual: "al mes", anual: "al año" };
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function Fuente({ fuentes, campos, perfiles, sinValor = false }: { fuentes: FuentesFicha; campos: CampoFicha[]; perfiles: Record<string, { nombre: string }>; sinValor?: boolean }) {
  const lista = campos.map((c) => fuentes[c]).filter(Boolean);
  const manual = lista.find((f) => f!.origen === "manual");
  if (manual) return <p className="mt-1 text-[11.5px] text-secundario">Capturado por {manual.por ? (perfiles[manual.por]?.nombre ?? "Legal") : "Legal"}</p>;
  const ia = lista.find((f) => f!.origen === "ia" && (f!.cita || f!.nota));
  if (!ia) {
    if (lista.some((f) => f!.origen === "titulo")) return <p className="mt-1 text-[11.5px] text-secundario">Provisional, según el título. La IA lo revisa contra el objeto del contrato.</p>;
    return null;
  }
  return (
    <>
      {/* Sin valor, la nota ya se muestra en lugar del dato. */}
      {ia.nota && !sinValor && (
        <p className="mt-1 text-[12.5px] text-secundario">
          {campos.includes("tipo_contrato") ? "Por su objeto" : "Análisis"}: {ia.nota}
        </p>
      )}
      {ia.cita ? (
        <details className="mt-1 text-[11.5px] text-secundario">
          <summary className="cursor-pointer select-none hover:text-tinta">Leído por la IA · ver cita</summary>
          <blockquote className="mt-1 border-l-2 border-linea pl-2 font-titulo text-[12.5px] leading-relaxed text-tinta">{ia.cita}</blockquote>
        </details>
      ) : (
        <p className="mt-1 text-[11.5px] text-secundario">Análisis de la IA</p>
      )}
    </>
  );
}

function Dato({ etiqueta, children, fuente }: { etiqueta: string; children: ReactNode; fuente?: ReactNode }) {
  return (
    <div className="border-b border-linea px-5 py-3.5 last:border-0 sm:grid sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-[12.5px] font-medium text-secundario">{etiqueta}</dt>
      <dd className="mt-0.5 text-[14px] sm:mt-0">
        {children}
        {fuente}
      </dd>
    </div>
  );
}

const sinDato = <span className="text-secundario">Sin dato</span>;

export function FichaContrato({
  c,
  vigencia,
  hoy,
  legal,
  perfiles,
  abogados,
  partes,
  area,
  hallazgosPendientes,
}: {
  c: ContratoFicha;
  vigencia: Vigencia;
  hoy: string;
  legal: boolean;
  perfiles: Record<string, { nombre: string }>;
  abogados: { id: string; nombre: string }[];
  partes: { propia: string | null; contraparte: string | null };
  area: string | null;
  hallazgosPendientes: number;
}) {
  const fuentes = c.ficha_fuentes ?? {};
  const monto = c.monto == null ? null : Number(c.monto);
  const anual = valorAnual({ monto, monto_periodo: c.monto_periodo }, vigencia);
  const conDatos = Object.keys(fuentes).length > 0;
  // De dónde sale cada dato (la cita que leyó la IA o quién lo capturó) es trabajo de Legal.
  const fuente = (...campos: CampoFicha[]) => (legal ? <Fuente fuentes={fuentes} campos={campos} perfiles={perfiles} sinValor={campos.every((k) => c[k as keyof ContratoFicha] == null)} /> : null);
  // Sin valor, Legal ve el análisis de la IA (por ejemplo, "el precio está en el Anexo B").
  const vacio = (campo: CampoFicha) => {
    const nota = legal && fuentes[campo]?.origen === "ia" ? fuentes[campo]?.nota : undefined;
    return nota ? <span className="text-secundario">{nota}</span> : sinDato;
  };
  const v = vigencia;
  const dias = (f: string) => {
    const n = diasEntre(hoy, f);
    return n === 0 ? "hoy" : n > 0 ? `en ${plural(n, "día", "días")}` : `hace ${plural(-n, "día", "días")}`;
  };

  const valores: ValoresFormulario = {
    tipo_contrato: c.tipo_contrato ?? "",
    objeto: c.objeto ?? "",
    monto: monto == null ? "" : String(monto),
    moneda: c.moneda ?? "MXN",
    monto_periodo: c.monto_periodo ?? "total",
    inicio_vigencia: c.inicio_vigencia ?? "",
    fin_vigencia: c.fin_vigencia ?? "",
    duracion_meses: c.duracion_meses?.toString() ?? "",
    renovacion_automatica: c.renovacion_automatica == null ? "" : c.renovacion_automatica ? "si" : "no",
    renovacion_meses: c.renovacion_meses?.toString() ?? "",
    aviso_dias: c.aviso_dias?.toString() ?? "",
    aviso_habiles: c.aviso_habiles ? "habiles" : "naturales",
    ley_aplicable: c.ley_aplicable ?? "",
    jurisdiccion: c.jurisdiccion ?? "",
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 px-8 py-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-linea bg-white p-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-secundario">Vigencia</p>
          <div className="mt-2">
            {v.situacion === "en_proceso" ? <EtiquetaEstado estado={c.estado as EstadoContrato} /> : <EtiquetaVigencia situacion={v.situacion} />}
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed">
            {v.situacion === "en_proceso" && `El contrato está ${ESTADOS[c.estado as EstadoContrato]?.toLowerCase() ?? "en proceso"}. La vigencia se cuenta desde la firma.`}
            {v.situacion === "por_iniciar" && v.inicio && `Inicia el ${fecha(v.inicio)}, ${dias(v.inicio)}.`}
            {v.situacion === "terminado" && `Terminado el ${fecha(c.terminado_en)}.${c.motivo_terminacion ? ` ${c.motivo_terminacion}` : ""}`}
            {v.situacion === "vencido" && v.fin && `Venció el ${fecha(v.fin)}, ${dias(v.fin)}.`}
            {["vigente", "renovado", "por_vencer"].includes(v.situacion) &&
              (v.fin ? `Vence el ${fecha(v.fin)}, ${dias(v.fin)}.` : "Sin fecha de término: vigencia por tiempo indefinido.")}
          </p>
          {v.renovaciones > 0 && (
            <p className="mt-1 text-[12.5px] text-secundario">
              Renovado automáticamente {plural(v.renovaciones, "vez", "veces")}; este es el periodo en curso.
              {v.periodoSupuesto ? " El contrato no dice el plazo de cada renovación: se usó el del periodo original." : ""}
            </p>
          )}
          {v.limiteAviso && !["terminado", "vencido"].includes(v.situacion) && (
            <p className={`mt-2 rounded-md px-3 py-2 text-[12.5px] ${v.limiteAviso >= hoy && diasEntre(hoy, v.limiteAviso) <= 30 ? "bg-medio-suave text-medio" : "bg-lienzo text-secundario"}`}>
              Último día para avisar que no se renueva: <span className="font-medium">{fecha(v.limiteAviso)}</span> ({dias(v.limiteAviso)}).
            </p>
          )}
          {legal && c.estado === "firmado" && (
            <div className="mt-3">
              <Terminacion contratoId={c.id} hoy={hoy} terminado={c.terminado_en ? { fecha: c.terminado_en, motivo: c.motivo_terminacion } : null} />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-linea bg-white p-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-secundario">Abogado responsable</p>
          <div className="mt-2">
            {legal ? (
              <SelectorResponsable contratoId={c.id} actual={c.responsable_id} opciones={abogados} />
            ) : (
              <p className="text-[14px]">{c.responsable_id ? (perfiles[c.responsable_id]?.nombre ?? "Legal") : <span className="text-secundario">Sin asignar</span>}</p>
            )}
          </div>
          <p className="mt-4 text-[11.5px] font-semibold uppercase tracking-wider text-secundario">Área responsable</p>
          <p className="mt-1 text-[14px]">{area ?? <span className="text-secundario">Sin área</span>}</p>
        </section>

        <section className="rounded-xl border border-linea bg-white p-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-secundario">Ficha</p>
          {c.ficha_confirmada_en ? (
            <p className="mt-2 text-[13.5px] leading-relaxed">
              <span className="font-medium text-bajo">Confirmada</span> por {c.ficha_confirmada_por ? (perfiles[c.ficha_confirmada_por]?.nombre ?? "Legal") : "Legal"}
              <span className="block text-[12.5px] text-secundario">{fechaHora(c.ficha_confirmada_en)}</span>
            </p>
          ) : conDatos ? (
            <p className="mt-2 text-[13.5px] leading-relaxed">
              <span className="font-medium text-medio">Pendiente de confirmar.</span>{" "}
              {legal ? "La IA llenó los datos desde el contrato; cada uno muestra la cita de donde sale." : "Legal revisará estos datos."}
            </p>
          ) : (
            <p className="mt-2 text-[13.5px] leading-relaxed text-secundario">Aún no tiene datos. {legal ? "Llénela con la IA o captúrela con Editar." : "Legal la completará."}</p>
          )}
          {legal && (
            <div className="mt-3 flex flex-wrap gap-2">
              {conDatos && !c.ficha_confirmada_en && <ConfirmarFicha contratoId={c.id} />}
              <LlenarConIA contratoId={c.id} texto={conDatos ? "Volver a leer con IA" : "Llenar con IA"} />
            </div>
          )}
        </section>
      </div>

      <TerminosEditables contratoId={c.id} valores={valores} editable={legal}>
        <dl>
          <Dato etiqueta="Partes">
            {partes.propia ?? <span className="text-secundario">Empresa sin expediente vinculado</span>}
            <span className="text-secundario"> con </span>
            {partes.contraparte ?? c.contraparte}
          </Dato>
          <Dato etiqueta="Tipo de contrato" fuente={fuente("tipo_contrato")}>
            {c.tipo_contrato ? TIPOS_CONTRATO[c.tipo_contrato as TipoContrato] : <span className="text-secundario">Por identificar</span>}
          </Dato>
          <Dato etiqueta="Objeto" fuente={fuente("objeto")}>
            {c.objeto ?? vacio("objeto")}
          </Dato>
          <Dato etiqueta="Monto" fuente={fuente("monto", "moneda", "monto_periodo")}>
            {monto == null ? (
              vacio("monto")
            ) : (
              <>
                <span className="font-medium">{dinero(monto, c.moneda)}</span> <span className="text-secundario">{PERIODO[c.monto_periodo ?? "total"]}</span>
                {anual != null && c.monto_periodo !== "anual" && <span className="block text-[12.5px] text-secundario">Valor anual estimado: {dinero(anual, c.moneda)}</span>}
              </>
            )}
          </Dato>
          <Dato etiqueta="Vigencia" fuente={fuente("inicio_vigencia", "fin_vigencia", "duracion_meses")}>
            {c.inicio_vigencia || c.fin_vigencia ? (
              <>
                {c.inicio_vigencia ? fecha(c.inicio_vigencia) : "Desde la firma"} al {c.fin_vigencia ? fecha(c.fin_vigencia) : v.finOriginal ? fecha(v.finOriginal) : "tiempo indefinido"}
                {c.duracion_meses ? <span className="text-secundario"> ({plural(c.duracion_meses, "mes", "meses")})</span> : null}
              </>
            ) : c.duracion_meses ? (
              <>{plural(c.duracion_meses, "mes", "meses")} {c.firmado_en ? `desde la firma (${fecha(c.firmado_en)})` : "a partir de la firma"}</>
            ) : (
              vacio("inicio_vigencia")
            )}
          </Dato>
          <Dato etiqueta="Renovación" fuente={fuente("renovacion_automatica", "renovacion_meses")}>
            {c.renovacion_automatica == null
              ? vacio("renovacion_automatica")
              : c.renovacion_automatica
                ? `Automática${c.renovacion_meses ? `, por periodos de ${plural(c.renovacion_meses, "mes", "meses")}` : ""}`
                : "No se renueva automáticamente"}
          </Dato>
          <Dato etiqueta="Aviso de no renovación o terminación" fuente={fuente("aviso_dias", "aviso_habiles")}>
            {c.aviso_dias == null ? vacio("aviso_dias") : `${plural(c.aviso_dias, c.aviso_habiles ? "día hábil" : "día natural", c.aviso_habiles ? "días hábiles" : "días naturales")} de anticipación`}
          </Dato>
          <Dato etiqueta="Ley aplicable" fuente={fuente("ley_aplicable")}>
            {c.ley_aplicable ?? vacio("ley_aplicable")}
          </Dato>
          <Dato etiqueta="Jurisdicción" fuente={fuente("jurisdiccion")}>
            {c.jurisdiccion ?? vacio("jurisdiccion")}
          </Dato>
        </dl>
      </TerminosEditables>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-linea bg-white p-5">
          <h2 className="titulo text-[18px]">Ciclo del contrato</h2>
          <ol className="mt-3 space-y-2 text-[13.5px]">
            {[
              ["Solicitud recibida", c.recibido_en],
              ["Aprobado por Legal", c.aprobado_en],
              ["Firmado", c.firmado_en],
              ["Terminado", c.terminado_en],
            ]
              .filter(([, f], i) => f || i < 3)
              .map(([t, f]) => (
                <li key={t} className="flex items-center justify-between gap-3 border-b border-linea pb-2 last:border-0">
                  <span className={f ? "" : "text-secundario"}>{t}</span>
                  <span className="text-secundario">{f ? fecha(f) : "Pendiente"}</span>
                </li>
              ))}
          </ol>
        </section>
        {legal && c.estado !== "firmado" && (
          <section className="rounded-xl border border-linea bg-white p-5">
            <h2 className="titulo text-[18px]">Revisión</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed">
              {hallazgosPendientes > 0 ? `Quedan ${plural(hallazgosPendientes, "hallazgo", "hallazgos")} de la IA por validar.` : "No hay hallazgos pendientes de validar."}
            </p>
            <Link href={`/contratos/${c.id}?pestana=documento`} className="mt-3 inline-block text-[13.5px] font-medium text-mandarina-texto hover:underline">
              Ir al documento y la revisión
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
