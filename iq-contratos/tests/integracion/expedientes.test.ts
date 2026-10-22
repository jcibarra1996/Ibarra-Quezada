// Reglas del expediente corporativo, plantillas y cambio de perfil de la demo,
// probadas con sesiones reales de los usuarios de la semilla.
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { admin, sesion, url } from "./apoyo";
import { CONTRASENA_DEMO } from "@/lib/demo";

const db = admin();
let abogado: SupabaseClient;
let negocio: SupabaseClient;
let directora: SupabaseClient;
let expediente: string;
let orgId: string;

beforeAll(async () => {
  [abogado, negocio, directora] = await Promise.all([
    sesion("abogado@empresa-cliente.example", CONTRASENA_DEMO),
    sesion("compras@empresa-cliente.example", CONTRASENA_DEMO),
    sesion("directora@empresa-cliente.example", CONTRASENA_DEMO),
  ]);
  const { data } = await db.from("companies").select("id, org_id").eq("denominacion", "LOGÍSTICA DEMO, S.A. DE C.V.").single();
  expediente = data!.id;
  orgId = data!.org_id;
  await db.from("companies").update({ estado: "validado" }).eq("id", expediente);
});

describe("expediente corporativo", () => {
  it("el área de negocio crea expedientes, pero nunca como empresa propia ni validados", async () => {
    const { data: u } = await negocio.auth.getUser();
    const { data, error } = await negocio
      .from("companies")
      .insert({ org_id: orgId, denominacion: "CONTRAPARTE NUEVA DEMO, S.A. DE C.V.", creado_por: u.user!.id, es_propia: true, estado: "validado" })
      .select("es_propia, estado")
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({ es_propia: false, estado: "por_validar" });
    await db.from("companies").delete().eq("denominacion", "CONTRAPARTE NUEVA DEMO, S.A. DE C.V.");
  });

  it("el área de negocio no puede validar", async () => {
    await db.from("companies").update({ estado: "por_validar" }).eq("id", expediente);
    const { error } = await negocio.from("companies").update({ estado: "validado" }).eq("id", expediente);
    expect(error?.message).toMatch(/Solo Legal puede validar/);
  });

  it("si el negocio corrige un dato de un expediente validado, regresa a validación", async () => {
    await abogado.from("companies").update({ estado: "validado" }).eq("id", expediente);
    const { data: antes } = await db.from("companies").select("datos").eq("id", expediente).single();
    await negocio.from("companies").update({ datos: { ...antes!.datos, correo_notificaciones: "avisos@logistica-demo.example" } }).eq("id", expediente);
    const { data: despues } = await db.from("companies").select("estado, validado_por").eq("id", expediente).single();
    expect(despues).toEqual({ estado: "por_validar", validado_por: null });
    const { data: evento } = await db.from("audit_events").select("accion, detalle").eq("company_id", expediente).order("creado_en", { ascending: false }).limit(1).single();
    expect(evento!.accion).toBe("expediente_por_validar");
    expect((evento!.detalle as { campos: string[] }).campos).toEqual(["correo_notificaciones"]);
  });

  it("Legal valida y queda registrado quién lo hizo", async () => {
    const { data: u } = await abogado.auth.getUser();
    const { error } = await abogado.from("companies").update({ estado: "validado" }).eq("id", expediente);
    expect(error).toBeNull();
    const { data } = await db.from("companies").select("estado, validado_por").eq("id", expediente).single();
    expect(data).toEqual({ estado: "validado", validado_por: u.user!.id });
  });

  it("nadie cambia desde la sesión si un expediente es de la empresa propia", async () => {
    const { error } = await abogado.from("companies").update({ es_propia: true }).eq("id", expediente);
    expect(error?.message).toMatch(/lo administra el sistema/);
  });

  it("los documentos corporativos solo se leen; nadie los escribe con su sesión", async () => {
    const { data: docs } = await negocio.from("corporate_documents").select("id").limit(1);
    expect(docs?.length).toBe(1);
    const { data: borrado } = await negocio.from("corporate_documents").delete().eq("id", docs![0].id).select("id");
    expect(borrado).toEqual([]);
  });

  it("otra organización no ve los expedientes", async () => {
    const anonimo = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const { data } = await anonimo.from("companies").select("id");
    expect(data ?? []).toEqual([]);
  });
});

describe("plantillas", () => {
  it("solo la dirección jurídica las edita y cada cambio sube la versión", async () => {
    const { data: t } = await db.from("templates").select("id, version, descripcion").eq("nombre", "Convenio de confidencialidad").single();
    const { data: porAbogado } = await abogado.from("templates").update({ descripcion: "cambio" }).eq("id", t!.id).select("id");
    expect(porAbogado).toEqual([]);
    const { error } = await directora.from("templates").update({ descripcion: `${t!.descripcion} ` }).eq("id", t!.id);
    expect(error).toBeNull();
    const { data: despues } = await db.from("templates").select("version").eq("id", t!.id).single();
    expect(despues!.version).toBe(t!.version + 1);
    await db.from("templates").update({ descripcion: t!.descripcion }).eq("id", t!.id);
  });
});

describe("cambio de perfil de la demo", () => {
  it("un enlace de un solo uso generado en el servidor abre la sesión del otro perfil", async () => {
    const { data: enlace } = await db.auth.admin.generateLink({ type: "magiclink", email: "abogado@empresa-cliente.example" });
    const c = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const { data, error } = await c.auth.verifyOtp({ type: "magiclink", token_hash: enlace.properties!.hashed_token });
    expect(error).toBeNull();
    expect(data.user?.email).toBe("abogado@empresa-cliente.example");
    const segundo = await c.auth.verifyOtp({ type: "magiclink", token_hash: enlace.properties!.hashed_token });
    expect(segundo.error).not.toBeNull();
  });

  it("la organización de la semilla está marcada como demostración", async () => {
    const { data } = await negocio.from("organizations").select("es_demo").single();
    expect(data!.es_demo).toBe(true);
  });
});
