import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { clienteSistema } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { registrar, registrarError } from "@/lib/log";
import { registrarUso } from "./uso";
import { AnalisisSchema } from "./esquema";
import {
  INSTRUCCIONES_SISTEMA,
  VERSION_PROMPT,
  mensajeUsuario,
  textoContrato,
  textoExpedientes,
  textoPlaybooks,
  playbooksParaAnalisis,
  type ExpedientePrompt,
  type PlaybookPrompt,
} from "./prompt";
import { expedienteParaPrompt } from "@/lib/corporativo/para-prompt";
import { procesarAnalisis, ErrorSalidaModelo } from "./procesar";
import { generarAlertas } from "@/lib/fechas/alertas";

export class ErrorAnalisis extends Error {}

const hoyEnMexico = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

// Corre el análisis de la versión vigente de un contrato y guarda el resultado.
// El llamador ya verificó que el usuario pertenece a la organización del contrato.
export async function analizarContrato(p: { contratoId: string; orgId: string; usuarioId: string | null }) {
  const db = clienteSistema();
  const { data: contrato } = await db
    .from("contracts")
    .select("id, org_id, version_actual_id, contraparte, estado, tipo_contrato, area_responsable_id, contraparte_id, propia_id, ficha_fuentes, organizations(nombre)")
    .eq("id", p.contratoId)
    .eq("org_id", p.orgId)
    .single();
  if (!contrato?.version_actual_id) throw new ErrorAnalisis("El contrato no tiene documento cargado.");
  // Un análisis nuevo crea hallazgos pendientes: no se permite sobre un contrato ya aprobado o firmado.
  if (contrato.estado === "aprobado" || contrato.estado === "firmado") {
    throw new ErrorAnalisis("El contrato ya está aprobado o firmado. Para analizarlo de nuevo, regréselo primero a En negociación.");
  }

  const idsExpedientes = [contrato.propia_id, contrato.contraparte_id].filter(Boolean) as string[];
  const [{ data: version }, { data: secciones }, { data: playbooks }, { data: expedientes }] = await Promise.all([
    db.from("contract_versions").select("id, texto_extraido").eq("id", contrato.version_actual_id).single(),
    db.from("contract_sections").select("id, etiqueta, texto, inicio, fin").eq("version_id", contrato.version_actual_id).order("orden"),
    db
      .from("playbooks")
      .select("id, tipo_contrato, nombre, playbook_positions(id, tema, preferida, respaldo, nunca_se_acepta, clausula_modelo, orden)")
      .eq("org_id", p.orgId),
    idsExpedientes.length
      ? db.from("companies").select("id, denominacion, rfc, tipo_persona, estado, datos, fuentes").eq("org_id", p.orgId).in("id", idsExpedientes)
      : Promise.resolve({ data: [] }),
  ]);
  if (!version || !secciones) throw new ErrorAnalisis("No se encontró el texto del contrato.");

  const fuenteTipo = (contrato.ficha_fuentes as { tipo_contrato?: { origen?: string } } | null)?.tipo_contrato?.origen;
  const playbooksPrompt: PlaybookPrompt[] = playbooksParaAnalisis(playbooks ?? [], contrato.tipo_contrato, fuenteTipo).map((pb) => ({
    tipo_contrato: pb.tipo_contrato,
    nombre: pb.nombre,
    posiciones: [...(pb.playbook_positions ?? [])].sort((a, b) => a.orden - b.orden),
  }));
  const posicionesValidas = new Set(playbooksPrompt.flatMap((pb) => pb.posiciones.map((x) => x.id)));
  const modelo = env.modelo();
  const bloquesExpediente: ExpedientePrompt[] = [];
  const propia = expedientes?.find((e) => e.id === contrato.propia_id);
  const contraparte = expedientes?.find((e) => e.id === contrato.contraparte_id);
  if (propia) bloquesExpediente.push(expedienteParaPrompt(propia, "empresa"));
  if (contraparte) bloquesExpediente.push(expedienteParaPrompt(contraparte, "contraparte"));

  const { data: analisis, error: errAnalisis } = await db
    .from("analyses")
    .insert({ org_id: p.orgId, version_id: version.id, modelo, version_prompt: VERSION_PROMPT, solicitado_por: p.usuarioId })
    .select("id")
    .single();
  if (errAnalisis || !analisis) throw new ErrorAnalisis("No se pudo iniciar el análisis.");

  const inicio = Date.now();
  try {
    const cliente = new Anthropic({ apiKey: env.anthropicKey(), timeout: 10 * 60 * 1000 });
    const organizacion = (contrato.organizations as unknown as { nombre: string } | null)?.nombre ?? "";
    const stream = cliente.beta.messages.stream({
      model: modelo,
      max_tokens: 32000,
      // Si el modelo declina, la API reintenta con el modelo recomendado (solo en la API de Anthropic).
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: env.esfuerzo("analisis"), format: betaZodOutputFormat(AnalisisSchema) },
      system: [
        { type: "text", text: INSTRUCCIONES_SISTEMA },
        // El playbook cambia poco: se guarda en caché entre análisis de la misma organización.
        { type: "text", text: `Playbooks de la dirección legal:\n\n${textoPlaybooks(playbooksPrompt)}`, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: mensajeUsuario({
            organizacion,
            fechaHoy: hoyEnMexico(),
            contrato: textoContrato(secciones),
            expedientes: textoExpedientes(bloquesExpediente),
          }),
        },
      ],
    });
    const mensaje = await stream.finalMessage();
    registrarUso("analisis", mensaje.usage, { contrato: contrato.id, playbooks: playbooksPrompt.length });

    if (mensaje.stop_reason === "refusal") throw new ErrorAnalisis("El modelo declinó analizar este documento. Revíselo manualmente.");
    if (mensaje.stop_reason === "max_tokens") throw new ErrorAnalisis("El contrato es demasiado extenso para un solo análisis.");
    const texto = mensaje.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    let crudo: unknown;
    try {
      crudo = JSON.parse(texto);
    } catch {
      throw new ErrorSalidaModelo("La respuesta del modelo no es JSON válido.");
    }

    const r = procesarAnalisis({ salida: crudo, texto: version.texto_extraido, secciones, posicionesValidas, hoy: hoyEnMexico() });

    if (r.hallazgos.length) {
      const { error } = await db.from("findings").insert(
        r.hallazgos.map((h) => ({ ...h, org_id: p.orgId, analysis_id: analisis.id, contract_id: contrato.id })),
      );
      if (error) throw new ErrorAnalisis("No se pudieron guardar los hallazgos.");
    }

    // Las fechas de análisis anteriores se reemplazan por las de la versión vigente.
    await db.from("key_dates").delete().eq("contract_id", contrato.id);
    if (r.fechas.length) {
      const { data: fechas } = await db
        .from("key_dates")
        .insert(r.fechas.map((f) => ({ ...f, org_id: p.orgId, contract_id: contrato.id, analysis_id: analisis.id })))
        .select("id, tipo, descripcion, fecha, derivada");
      await generarAlertas(db, { orgId: p.orgId, contratoId: contrato.id, areaId: contrato.area_responsable_id, fechas: fechas ?? [] });
    }

    await db
      .from("analyses")
      .update({
        estado: "completado",
        tipo_detectado: r.tipo_contrato,
        objeto_detectado: r.objeto,
        resumen_negocio: r.resumen_negocio,
        hallazgos_descartados_sin_cita: r.descartados_sin_cita,
        playbook_id: (playbooks ?? []).find((pb) => pb.tipo_contrato === r.tipo_contrato)?.id ?? null,
        duracion_ms: Date.now() - inicio,
        tokens_entrada: mensaje.usage.input_tokens + (mensaje.usage.cache_read_input_tokens ?? 0) + (mensaje.usage.cache_creation_input_tokens ?? 0),
        tokens_salida: mensaje.usage.output_tokens,
      })
      .eq("id", analisis.id);

    await db
      .from("contracts")
      .update({
        // El tipo que Legal capturó a mano en la ficha no lo cambia el análisis.
        ...((contrato.ficha_fuentes as { tipo_contrato?: { origen?: string } } | null)?.tipo_contrato?.origen === "manual" ? {} : { tipo_contrato: r.tipo_contrato }),
        objeto: r.objeto,
        riesgo_max: r.riesgo_max,
        ...(contrato.contraparte ? {} : { contraparte: r.contraparte ?? "" }),
        ...(contrato.estado === "recibido" ? { estado: "en_revision" } : {}),
      })
      .eq("id", contrato.id);

    await db.from("audit_events").insert({
      org_id: p.orgId,
      contract_id: contrato.id,
      actor_id: null,
      accion: "analisis_completado",
      detalle: {
        hallazgos: r.hallazgos.length,
        descartados: r.descartados_sin_cita,
        corporativos: r.hallazgos.filter((h) => h.tipo === "dato_corporativo").length,
        expedientes: bloquesExpediente.length,
        modelo,
        version_prompt: VERSION_PROMPT,
      },
    });
    registrar("analisis_completado", {
      contrato: contrato.id,
      hallazgos: r.hallazgos.length,
      descartados: r.descartados_sin_cita,
      ms: Date.now() - inicio,
    });
    return { analisisId: analisis.id };
  } catch (e) {
    const mensaje =
      e instanceof ErrorAnalisis || e instanceof ErrorSalidaModelo
        ? e.message
        : e instanceof Anthropic.AuthenticationError
          ? "La llave de Anthropic no es válida."
          : e instanceof Anthropic.RateLimitError
            ? "Se alcanzó el límite de uso de la API. Intente en unos minutos."
            : e instanceof Anthropic.APIError
              ? "El servicio de análisis no respondió correctamente. Intente de nuevo."
              : e instanceof Error && e.message.startsWith("Falta la variable")
                ? e.message
                : "No fue posible completar el análisis.";
    await db.from("analyses").update({ estado: "error", error: mensaje, duracion_ms: Date.now() - inicio }).eq("id", analisis.id);
    await db.from("audit_events").insert({ org_id: p.orgId, contract_id: contrato.id, accion: "analisis_fallido", detalle: {} });
    registrarError("analisis_fallido", e, { contrato: contrato.id });
    throw new ErrorAnalisis(mensaje);
  }
}
