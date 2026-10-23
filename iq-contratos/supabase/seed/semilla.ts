// Datos semilla de la demostración: una empresa ficticia, 3 usuarios, áreas,
// el playbook de ejemplo, plantillas, expedientes corporativos y 7 contratos ficticios
// en formato mexicano, con su ficha (monto, vigencia, renovación, aviso, jurisdicción).
//
// Uso:  npm run seed
// Los contratos se convierten a .docx y pasan por el mismo proceso que una subida real
// (almacenamiento privado, extracción de texto y parser de cláusulas).
// Se ejecuta con la condición "react-server" para cargar los módulos del servidor.

import { config } from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PLAYBOOKS_EJEMPLO } from "./playbook";
import { CONTRASENA_DEMO, ORG_DEMO, USUARIOS_DEMO } from "../../lib/demo";
import { registrarContrato, BUCKET } from "../../lib/contratos/registrar";
import { analizarContrato } from "../../lib/ai/analizar";
import { textoADocx } from "../../lib/docx/desde-texto";
import { sembrarClm } from "./clm";
import { FICHAS, fichaDemo } from "./fichas";
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

// Escenario de la demo. Las fechas de aprobación y firma alimentan el tiempo promedio de
// revisión del tablero; no se registran decisiones sobre hallazgos que nadie tomó.
const ESCENARIO: Record<string, { estado: string; recibido: string; area: string; aprobado?: string; firmado?: string }> = {
  "01-suministro-proveedor-xyz.txt": { estado: "en_revision", recibido: "2026-10-19T16:20:00-06:00", area: "Compras" },
  "02-servicios-mantenimiento.txt": { estado: "recibido", recibido: "2026-10-21T10:05:00-06:00", area: "Operaciones" },
  "03-arrendamiento-oficinas.txt": { estado: "aprobado", recibido: "2026-09-28T12:40:00-06:00", area: "Administración", aprobado: "2026-10-09T13:00:00-06:00" },
  "04-confidencialidad-tecnologia.txt": { estado: "firmado", recibido: "2026-05-04T09:15:00-06:00", area: "Operaciones", aprobado: "2026-05-08T17:30:00-06:00", firmado: "2026-05-15T12:00:00-06:00" },
  "05-servicios-logistica.txt": { estado: "firmado", recibido: "2025-11-25T11:30:00-06:00", area: "Operaciones", aprobado: "2025-12-03T18:10:00-06:00", firmado: "2025-12-12T12:00:00-06:00" },
  "06-servicios-limpieza.txt": { estado: "firmado", recibido: "2025-02-10T10:00:00-06:00", area: "Administración", aprobado: "2025-02-20T17:00:00-06:00", firmado: "2025-02-25T12:00:00-06:00" },
  "07-licencia-software.txt": { estado: "firmado", recibido: "2024-05-10T09:30:00-06:00", area: "Operaciones", aprobado: "2024-05-20T16:00:00-06:00", firmado: "2024-05-28T12:00:00-06:00" },
};

// Con --analizar se corre el análisis real (requiere ANTHROPIC_API_KEY) del contrato de
// suministro, para que la demo arranque con ese análisis listo.
const ANALIZAR = process.argv.includes("--analizar");

// Lista todos los archivos bajo una carpeta del almacenamiento, en cualquier nivel.
async function archivosBajo(prefijo: string): Promise<string[]> {
  const { data } = await db.storage.from(BUCKET).list(prefijo, { limit: 1000 });
  const rutas: string[] = [];
  for (const f of data ?? []) {
    const ruta = `${prefijo}/${f.name}`;
    if (f.id) rutas.push(ruta);
    else rutas.push(...(await archivosBajo(ruta)));
  }
  return rutas;
}

async function limpiar() {
  const { data: orgs } = await db.from("organizations").select("id").eq("nombre", ORG_DEMO);
  for (const o of orgs ?? []) {
    const rutas = await archivosBajo(o.id);
    for (let i = 0; i < rutas.length; i += 100) await db.storage.from(BUCKET).remove(rutas.slice(i, i + 100));
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
  const abogado = usuarios[1];
  const compras = usuarios[2];

  for (const pb of PLAYBOOKS_EJEMPLO) {
    const { data: playbook } = await db
      .from("playbooks")
      .insert({ org_id: org.id, tipo_contrato: pb.tipo_contrato, nombre: pb.nombre, actualizado_por: directora.id })
      .select("id")
      .single();
    await db.from("playbook_positions").insert(pb.posiciones.map((p, i) => ({ ...p, org_id: org.id, playbook_id: playbook!.id, orden: i })));
  }

  // Expedientes y plantillas antes que los contratos, para que cada contrato quede
  // vinculado con el expediente de sus partes al registrarse.
  console.log("Ciclo de vida: plantillas y expedientes corporativos...");
  await sembrarClm(db, { orgId: org.id, directoraId: directora.id, comprasId: compras.id });

  const dir = path.join(import.meta.dirname, "contratos");
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith(".txt")).sort()) {
    const escenario = ESCENARIO[archivo];
    const texto = readFileSync(path.join(dir, archivo), "utf8");
    const docx = await textoADocx(texto);
    const { contratoId } = await registrarContrato({
      usuario: compras,
      nombreArchivo: archivo.replace(/\.txt$/, ".docx"),
      datos: docx,
      areaId: areaId(escenario.area),
      recibidoEn: escenario.recibido,
    });
    // Recorrer los estados en orden respeta las reglas de la base (firmado exige aprobado).
    const ruta = ["en_revision", "aprobado", "firmado"];
    for (const paso of ruta.slice(0, ruta.indexOf(escenario.estado) + 1)) {
      const { error } = await db.from("contracts").update({ estado: paso }).eq("id", contratoId);
      if (error) throw error;
    }
    if (escenario.aprobado || escenario.firmado) {
      await db.from("contracts").update({ aprobado_en: escenario.aprobado ?? null, firmado_en: escenario.firmado ?? null }).eq("id", contratoId);
    }
    const ficha = FICHAS[archivo];
    if (ficha) {
      const { valores, fuentes } = fichaDemo(ficha, texto);
      const quien = (q: "directora" | "abogado" | null) => (q === "directora" ? directora.id : q === "abogado" ? abogado.id : null);
      const { error } = await db
        .from("contracts")
        .update({
          ...valores,
          // En una carga real el tipo lo identifica el análisis de la IA.
          tipo_contrato: ficha.tipo,
          ficha_fuentes: fuentes,
          responsable_id: quien(ficha.responsable),
          ficha_confirmada_por: quien(ficha.confirmada),
          ficha_confirmada_en: ficha.confirmada ? (escenario.firmado ?? escenario.recibido) : null,
        })
        .eq("id", contratoId);
      if (error) throw error;
    }
    console.log(`  ${archivo} -> ${contratoId}`);
    if (ANALIZAR && archivo.startsWith("01-")) {
      console.log("    Analizando con la API de Anthropic (1 a 3 minutos)...");
      await analizarContrato({ contratoId, orgId: org.id, usuarioId: null });
      console.log("    Análisis listo.");
    }
  }

  console.log("\nListo. Usuarios de demostración (contraseña: " + CONTRASENA_DEMO + "):");
  for (const u of USUARIOS_DEMO) console.log(`  ${u.correo}  ${u.rol}`);
}

main().catch((e) => {
  console.error("La semilla falló:", e?.message ?? e);
  process.exit(1);
});
