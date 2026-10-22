// Verifica el aislamiento por organización y los permisos por rol directamente contra
// Supabase local (requiere `npx supabase start` y `npm run seed`).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { admin, sesion } from "./apoyo";
import { CONTRASENA_DEMO } from "@/lib/demo";

const db = admin();
let ajeno: SupabaseClient;
let orgAjena: string;
let usuarioAjeno: string;
let contratoDemo: string;

beforeAll(async () => {
  const { data: org } = await db.from("organizations").insert({ nombre: "ORGANIZACIÓN DE PRUEBA RLS" }).select("id").single();
  orgAjena = org!.id;
  const correo = `rls-${Date.now()}@otra.example`;
  const { data: u } = await db.auth.admin.createUser({ email: correo, password: "Prueba-RLS-2026", email_confirm: true });
  usuarioAjeno = u.user!.id;
  await db.from("profiles").insert({ id: usuarioAjeno, org_id: orgAjena, nombre: "Usuario Ajeno", rol: "director_juridico" });
  ajeno = await sesion(correo, "Prueba-RLS-2026");
  const { data: c } = await db.from("contracts").select("id").neq("org_id", orgAjena).limit(1).single();
  contratoDemo = c!.id;
});

afterAll(async () => {
  await db.auth.admin.deleteUser(usuarioAjeno);
  await db.from("organizations").delete().eq("id", orgAjena);
});

describe("aislamiento entre organizaciones", () => {
  it.each(["contracts", "contract_versions", "contract_sections", "findings", "audit_events", "playbooks", "profiles", "alerts"])(
    "un usuario de otra organización no ve %s ajenos",
    async (tabla) => {
      const { data, error } = await ajeno.from(tabla).select("org_id");
      expect(error).toBeNull();
      expect((data ?? []).every((f) => f.org_id === orgAjena)).toBe(true);
    },
  );

  it("no puede modificar contratos de otra organización", async () => {
    const { data } = await ajeno.from("contracts").update({ estado: "aprobado" }).eq("id", contratoDemo).select();
    expect(data).toEqual([]);
  });

  it("nadie lista ni descarga archivos directamente del almacenamiento", async () => {
    const { data } = await ajeno.from("contract_versions").select("storage_path").limit(1);
    expect(data).toEqual([]);
    const { data: lista } = await ajeno.storage.from("contratos").list("");
    expect(lista ?? []).toEqual([]);
  });
});

describe("permisos por rol", () => {
  it("negocio ve los contratos pero no puede cambiar su estado", async () => {
    const negocio = await sesion("compras@empresa-cliente.example", CONTRASENA_DEMO);
    const { data: visibles } = await negocio.from("contracts").select("id");
    expect((visibles ?? []).length).toBeGreaterThan(0);
    const { data } = await negocio.from("contracts").update({ estado: "aprobado" }).eq("id", contratoDemo).select();
    expect(data).toEqual([]);
  });

  it("negocio no puede editar el playbook", async () => {
    const negocio = await sesion("compras@empresa-cliente.example", CONTRASENA_DEMO);
    const { data } = await negocio.from("playbook_positions").update({ preferida: "x" }).neq("id", "00000000-0000-0000-0000-000000000000").select();
    expect(data).toEqual([]);
  });

  it("el abogado no puede alterar datos que administra el sistema", async () => {
    const abogado = await sesion("abogado@empresa-cliente.example", CONTRASENA_DEMO);
    const { error } = await abogado.from("contracts").update({ riesgo_max: "bajo" }).eq("id", contratoDemo);
    expect(error?.message).toMatch(/lo administra el sistema/);
  });

  it("solo el director jurídico consulta la bitácora de accesos", async () => {
    const abogado = await sesion("abogado@empresa-cliente.example", CONTRASENA_DEMO);
    const { data } = await abogado.from("document_access_log").select("id");
    expect(data).toEqual([]);
  });
});
