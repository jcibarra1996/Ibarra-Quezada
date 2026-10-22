// Datos del ciclo de vida para la demostración: organización de demostración (permite
// cambiar de perfil), plantillas base, expedientes corporativos con sus documentos y
// vínculo de los contratos existentes con los expedientes. Es idempotente: lo que ya
// existe no se duplica, para poder correrlo sobre una demo en uso.
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLANTILLAS_BASE } from "../../lib/plantillas/base";
import { textoADocx } from "../../lib/docx/desde-texto";
import { registrarDocumentoCorporativo } from "../../lib/corporativo/documentos";
import { identificarPartes } from "../../lib/corporativo/vincular";
import { EXPEDIENTES_DEMO } from "./expedientes";

export async function sembrarClm(db: SupabaseClient, p: { orgId: string; directoraId: string; comprasId: string }) {
  await db.from("organizations").update({ es_demo: true }).eq("id", p.orgId);

  const { data: existentes } = await db.from("templates").select("nombre").eq("org_id", p.orgId);
  const nuevas = PLANTILLAS_BASE.filter((t) => !existentes?.some((e) => e.nombre === t.nombre));
  if (nuevas.length) {
    const { error } = await db.from("templates").insert(nuevas.map((t) => ({ ...t, org_id: p.orgId, actualizado_por: p.directoraId })));
    if (error) throw error;
  }
  console.log(`  Plantillas: ${nuevas.length} nuevas, ${PLANTILLAS_BASE.length - nuevas.length} ya existían.`);

  const { data: yaHay } = await db.from("companies").select("denominacion").eq("org_id", p.orgId);
  for (const e of EXPEDIENTES_DEMO) {
    if (yaHay?.some((x) => x.denominacion === e.denominacion)) continue;
    const { data: fila, error } = await db
      .from("companies")
      .insert({ org_id: p.orgId, denominacion: e.denominacion, rfc: e.rfc, es_propia: e.es_propia, datos: e.datos, creado_por: p.comprasId })
      .select("id")
      .single();
    if (error || !fila) throw error;
    for (const d of e.documentos) {
      await registrarDocumentoCorporativo({
        usuario: { id: p.comprasId, org_id: p.orgId },
        companyId: fila.id,
        tipo: d.tipo,
        nombreArchivo: d.archivo,
        datos: await textoADocx(d.texto, d.archivo),
        extraccionConocida: {
          modelo: "semilla-demo",
          extraccion: {
            tipo_documento: d.tipo,
            denominacion: e.denominacion,
            tipo_persona: "moral",
            rfc: d.rfc ?? null,
            campos: d.campos,
            observaciones: ["Documento ficticio de demostración."],
            resumen: d.resumen,
          },
        },
      });
    }
    if (e.validado) {
      await db.from("companies").update({ estado: "validado", validado_por: p.directoraId }).eq("id", fila.id);
    }
    console.log(`  Expediente ${e.denominacion}: ${e.documentos.length} documentos.`);
  }

  // Vincular los contratos de la demo con los expedientes por denominación.
  const [{ data: expedientes }, { data: contratos }] = await Promise.all([
    db.from("companies").select("id, denominacion, es_propia").eq("org_id", p.orgId),
    db.from("contracts").select("id, contraparte, version_actual_id, propia_id, contraparte_id").eq("org_id", p.orgId),
  ]);
  for (const c of contratos ?? []) {
    if (c.propia_id && c.contraparte_id) continue;
    const { data: proemio } = await db.from("contract_sections").select("texto").eq("version_id", c.version_actual_id).eq("tipo", "proemio").maybeSingle();
    const r = identificarPartes({ proemio: proemio?.texto ?? "", contraparte: c.contraparte, expedientes: expedientes ?? [] });
    await db
      .from("contracts")
      .update({ propia_id: c.propia_id ?? r.propiaId, contraparte_id: c.contraparte_id ?? r.contraparteId })
      .eq("id", c.id);
  }
}
