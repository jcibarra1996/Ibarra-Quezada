// Datos semilla de la demostración: una empresa ficticia, 3 usuarios, áreas,
// el playbook de ejemplo y 5 contratos ficticios en formato mexicano.
//
// Uso:  npm run seed
// Los contratos se convierten a .docx y pasan por el mismo proceso que una subida real
// (almacenamiento privado, extracción de texto y parser de cláusulas).
// Se ejecuta con la condición "react-server" para cargar los módulos del servidor.

import { config } from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import { PLAYBOOKS_EJEMPLO } from "./playbook";
import { CONTRASENA_DEMO, ORG_DEMO, USUARIOS_DEMO } from "../../lib/demo";
import { registrarContrato, BUCKET } from "../../lib/contratos/registrar";
import type { Usuario } from "../../lib/tipos";

config({ path: path.join(import.meta.dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secreta = process.env.SUPABASE_SECRET_KEY;
if (!url || !secreta) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}
const db = createClient(url, secreta, { auth: { persistSession: false } });

const AREAS = ["Jurídico", "Compras", "Finanzas", "Operaciones", "Administración"];

// Estado y fechas de cada contrato en el escenario de la demo.
const ESCENARIO: Record<string, { estado: string; recibido: string; area: string }> = {
  "01-suministro-proveedor-xyz.txt": { estado: "en_revision", recibido: "2026-10-19T16:20:00-06:00", area: "Compras" },
  "02-servicios-mantenimiento.txt": { estado: "recibido", recibido: "2026-10-21T10:05:00-06:00", area: "Operaciones" },
  "03-arrendamiento-oficinas.txt": { estado: "en_negociacion", recibido: "2026-09-28T12:40:00-06:00", area: "Administración" },
  "04-confidencialidad-tecnologia.txt": { estado: "en_revision", recibido: "2026-10-14T09:15:00-06:00", area: "Operaciones" },
  "05-servicios-logistica.txt": { estado: "en_revision", recibido: "2026-10-08T11:30:00-06:00", area: "Operaciones" },
};

function aDocx(texto: string): Promise<Buffer> {
  const bloques = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const parrafos = bloques.map((b) => {
    const encabezado = /^(DECLARACIONES|CLÁUSULAS|ANTECEDENTES)$/.test(b);
    const lineas = b.split("\n");
    return new Paragraph({
      alignment: encabezado ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: { after: 200 },
      children: lineas.map((l, i) => new TextRun({ text: l, bold: encabezado, break: i > 0 ? 1 : undefined, font: "Times New Roman", size: 24 })),
    });
  });
  return Packer.toBuffer(new Document({ sections: [{ children: parrafos }] }));
}

async function limpiar() {
  const { data: orgs } = await db.from("organizations").select("id").eq("nombre", ORG_DEMO);
  for (const o of orgs ?? []) {
    const { data: archivos } = await db.storage.from(BUCKET).list(o.id, { limit: 1000 });
    for (const carpeta of archivos ?? []) {
      const { data: dentro } = await db.storage.from(BUCKET).list(`${o.id}/${carpeta.name}`, { limit: 1000 });
      const rutas = (dentro ?? []).map((f) => `${o.id}/${carpeta.name}/${f.name}`);
      if (rutas.length) await db.storage.from(BUCKET).remove(rutas);
    }
    await db.from("organizations").delete().eq("id", o.id);
  }
  const { data: usuarios } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const u of usuarios?.users ?? []) {
    if (USUARIOS_DEMO.some((d) => d.correo === u.email)) await db.auth.admin.deleteUser(u.id);
  }
}

async function main() {
  console.log("Limpiando datos de demostración anteriores...");
  await limpiar();

  const { data: org, error: errOrg } = await db.from("organizations").insert({ nombre: ORG_DEMO }).select("id").single();
  if (errOrg || !org) throw errOrg;

  const { data: areas } = await db
    .from("areas")
    .insert(AREAS.map((nombre) => ({ org_id: org.id, nombre })))
    .select("id, nombre");
  const areaId = (n: string) => areas?.find((a) => a.nombre === n)?.id ?? null;

  const usuarios: Usuario[] = [];
  for (const u of USUARIOS_DEMO) {
    const { data, error } = await db.auth.admin.createUser({ email: u.correo, password: CONTRASENA_DEMO, email_confirm: true });
    if (error || !data.user) throw error;
    await db.from("profiles").insert({ id: data.user.id, org_id: org.id, nombre: u.nombre, puesto: u.puesto, rol: u.clave, area_id: areaId(u.area) });
    usuarios.push({ id: data.user.id, org_id: org.id, nombre: u.nombre, puesto: u.puesto, rol: u.clave, correo: u.correo });
  }
  const directora = usuarios[0];
  const compras = usuarios[2];

  for (const pb of PLAYBOOKS_EJEMPLO) {
    const { data: playbook } = await db
      .from("playbooks")
      .insert({ org_id: org.id, tipo_contrato: pb.tipo_contrato, nombre: pb.nombre, actualizado_por: directora.id })
      .select("id")
      .single();
    await db.from("playbook_positions").insert(pb.posiciones.map((p, i) => ({ ...p, org_id: org.id, playbook_id: playbook!.id, orden: i })));
  }

  const dir = path.join(import.meta.dirname, "contratos");
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith(".txt")).sort()) {
    const escenario = ESCENARIO[archivo];
    const texto = readFileSync(path.join(dir, archivo), "utf8");
    const docx = await aDocx(texto);
    const { contratoId } = await registrarContrato({
      usuario: compras,
      nombreArchivo: archivo.replace(/\.txt$/, ".docx"),
      datos: docx,
      areaId: areaId(escenario.area),
      recibidoEn: escenario.recibido,
    });
    if (escenario.estado !== "recibido") await db.from("contracts").update({ estado: escenario.estado }).eq("id", contratoId);
    console.log(`  ${archivo} -> ${contratoId}`);
  }

  console.log("\nListo. Usuarios de demostración (contraseña: " + CONTRASENA_DEMO + "):");
  for (const u of USUARIOS_DEMO) console.log(`  ${u.correo}  ${u.rol}`);
}

main().catch((e) => {
  console.error("La semilla falló:", e?.message ?? e);
  process.exit(1);
});
