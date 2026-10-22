// Reglas de validación humana aplicadas por la base de datos (triggers), probadas con
// sesiones reales de los usuarios de la semilla.
import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { admin, sesion } from "./apoyo";
import { CONTRASENA_DEMO } from "@/lib/demo";

const db = admin();
let abogado: SupabaseClient;
let negocio: SupabaseClient;
let contrato: string;
let alto: string;
let medio: string;

beforeAll(async () => {
  abogado = await sesion("abogado@empresa-cliente.example", CONTRASENA_DEMO);
  negocio = await sesion("compras@empresa-cliente.example", CONTRASENA_DEMO);
  const { data: c } = await db.from("contracts").select("id, org_id, version_actual_id").eq("titulo", "Convenio de confidencialidad").single();
  contrato = c!.id;
  await db.from("contracts").update({ estado: "en_revision" }).eq("id", contrato);
  // Análisis de prueba con un hallazgo alto y uno medio (escritura del sistema).
  const { data: a } = await db
    .from("analyses")
    .insert({ org_id: c!.org_id, version_id: c!.version_actual_id, estado: "completado", modelo: "prueba", version_prompt: "prueba" })
    .select("id")
    .single();
  const base = { org_id: c!.org_id, analysis_id: a!.id, contract_id: contrato, tipo: "desviacion_playbook", clausula: "QUINTA", explicacion: "x", redaccion_propuesta: "texto propuesto", cita: "cita", cita_inicio: 0, cita_fin: 4 };
  const { data: f } = await db
    .from("findings")
    .insert([
      { ...base, numero: 1, tema: "Prueba alto", riesgo: "alto" },
      { ...base, numero: 2, tema: "Prueba medio", riesgo: "medio" },
    ])
    .select("id, riesgo");
  alto = f!.find((x) => x.riesgo === "alto")!.id;
  medio = f!.find((x) => x.riesgo === "medio")!.id;
});

describe("validación humana obligatoria", () => {
  it("no se puede aprobar con un hallazgo alto pendiente", async () => {
    const { error } = await abogado.from("contracts").update({ estado: "aprobado" }).eq("id", contrato);
    expect(error?.message).toMatch(/queda 1 hallazgo de riesgo alto pendiente/);
  });

  it("negocio no puede validar hallazgos", async () => {
    const { data } = await negocio.from("findings").update({ estado: "aceptado" }).eq("id", alto).select();
    expect(data).toEqual([]);
  });

  it("el abogado no puede alterar el contenido del hallazgo, solo su decisión", async () => {
    const { error } = await abogado.from("findings").update({ riesgo: "bajo" }).eq("id", alto);
    expect(error?.message).toMatch(/Solo se puede registrar la decisión/);
  });

  it("un hallazgo editado exige texto final", async () => {
    const { error } = await abogado.from("findings").update({ estado: "editado", texto_final: "  " }).eq("id", alto);
    expect(error?.message).toMatch(/necesita el texto final/);
  });

  it("al aceptar registra usuario, hora y el texto propuesto", async () => {
    const { data } = await abogado.from("findings").update({ estado: "aceptado" }).eq("id", alto).select("estado, decidido_por, decidido_en, texto_final").single();
    const { data: u } = await abogado.auth.getUser();
    expect(data).toMatchObject({ estado: "aceptado", decidido_por: u.user!.id, texto_final: "texto propuesto" });
    expect(data!.decidido_en).toBeTruthy();
  });

  it("con los altos validados se puede aprobar aunque haya medios pendientes", async () => {
    const { error } = await abogado.from("contracts").update({ estado: "aprobado" }).eq("id", contrato);
    expect(error).toBeNull();
  });

  it("un contrato aprobado congela sus validaciones", async () => {
    const { error } = await abogado.from("findings").update({ estado: "pendiente" }).eq("id", alto);
    expect(error?.message).toMatch(/regréselo primero a En negociación/);
    const { error: e2 } = await abogado.from("findings").update({ estado: "descartado" }).eq("id", medio);
    expect(e2?.message).toMatch(/regréselo primero/);
  });

  it("solo un contrato aprobado puede marcarse como firmado", async () => {
    await abogado.from("contracts").update({ estado: "en_negociacion" }).eq("id", contrato);
    const { error } = await abogado.from("contracts").update({ estado: "firmado" }).eq("id", contrato);
    expect(error?.message).toMatch(/Solo un contrato aprobado/);
  });

  it("cada decisión queda en el historial", async () => {
    const { data } = await abogado.from("audit_events").select("accion").eq("contract_id", contrato);
    const acciones = (data ?? []).map((e) => e.accion);
    expect(acciones).toContain("hallazgo_aceptado");
    expect(acciones).toContain("estado_cambiado");
  });
});
