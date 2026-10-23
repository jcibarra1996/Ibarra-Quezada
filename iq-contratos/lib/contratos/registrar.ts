import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { clienteSistema } from "@/lib/supabase/admin";
import { leerContrato, MIME_PDF } from "@/lib/parsing/extraer";
import { contraparteDelProemio, tituloDelProemio } from "./datos-generales";
import { tipoPorTitulo } from "./tipo-por-titulo";
import { identificarPartes } from "@/lib/corporativo/vincular";
import type { Usuario } from "@/lib/tipos";

export const BUCKET = "contratos";

interface Entrada {
  usuario: Usuario;
  nombreArchivo: string;
  datos: Buffer;
  contraparte?: string | null;
  areaId?: string | null;
  // Para cargar una nueva versión de un contrato existente.
  contratoId?: string;
  origen?: "subida" | "contrapropuesta" | "plantilla";
  recibidoEn?: string;
  // Expedientes de las partes; si no se indican, se buscan por denominación en el proemio.
  contraparteId?: string | null;
  propiaId?: string | null;
  plantillaId?: string | null;
  solicitud?: Record<string, unknown>;
  tipoContrato?: string | null;
}

// Lee el archivo, guarda el original en almacenamiento privado y registra el contrato,
// su versión y sus secciones. Las escrituras son del sistema; el llamador ya verificó la sesión.
export async function registrarContrato(e: Entrada) {
  const { mime, doc } = await leerContrato(e.nombreArchivo, e.datos);
  const db = clienteSistema();
  const org = e.usuario.org_id;

  const { data: organizacion } = await db.from("organizations").select("nombre").eq("id", org).single();
  const proemio = doc.secciones.find((s) => s.tipo === "proemio")?.texto ?? "";

  // Toda referencia que llega del usuario se valida contra su organización.
  let areaId: string | null = null;
  if (e.areaId) {
    const { data: area } = await db.from("areas").select("id").eq("id", e.areaId).eq("org_id", org).maybeSingle();
    areaId = area?.id ?? null;
  }
  if (e.contratoId) {
    const { data: existente } = await db.from("contracts").select("id").eq("id", e.contratoId).eq("org_id", org).maybeSingle();
    if (!existente) throw new Error("Contrato no encontrado.");
  }

  let contratoId = e.contratoId;
  let numero = 1;
  if (!contratoId) {
    const contraparte = e.contraparte?.trim() || contraparteDelProemio(proemio, organizacion?.nombre ?? "") || "";
    const { data: expedientes } = await db.from("companies").select("id, denominacion, es_propia").eq("org_id", org);
    const lista = expedientes ?? [];
    const valido = (id: string | null | undefined) => (id && lista.some((x) => x.id === id) ? id : null);
    const auto = identificarPartes({ proemio, contraparte, expedientes: lista });
    const titulo = tituloDelProemio(proemio, e.nombreArchivo);
    const { data: nuevo, error } = await db
      .from("contracts")
      .insert({
        org_id: org,
        titulo,
        contraparte,
        area_responsable_id: areaId,
        creado_por: e.usuario.id,
        solicitado_por: e.usuario.id,
        contraparte_id: valido(e.contraparteId) ?? auto.contraparteId,
        propia_id: valido(e.propiaId) ?? auto.propiaId,
        plantilla_id: e.plantillaId ?? null,
        datos_solicitud: e.solicitud ?? {},
        // Provisional mientras la IA lee el objeto: el tipo que dice el título, si lo dice.
        tipo_contrato: e.tipoContrato ?? tipoPorTitulo(titulo),
        ...(!e.tipoContrato && tipoPorTitulo(titulo) ? { ficha_fuentes: { tipo_contrato: { origen: "titulo" } } } : {}),
        ...(e.recibidoEn ? { recibido_en: e.recibidoEn } : {}),
      })
      .select("id")
      .single();
    if (error || !nuevo) throw new Error("No se pudo registrar el contrato.");
    contratoId = nuevo.id as string;
  } else {
    const { data: ultima } = await db
      .from("contract_versions")
      .select("numero")
      .eq("contract_id", contratoId)
      .eq("org_id", org)
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle();
    numero = (ultima?.numero ?? 0) + 1;
  }

  const versionId = randomUUID();
  const extension = mime === MIME_PDF ? "pdf" : "docx";
  const ruta = `${org}/${contratoId}/${versionId}.${extension}`;
  const subida = await db.storage.from(BUCKET).upload(ruta, e.datos, { contentType: mime, upsert: false });
  if (subida.error) throw new Error("No se pudo guardar el archivo en el almacenamiento privado.");

  const { error: errVersion } = await db.from("contract_versions").insert({
    id: versionId,
    org_id: org,
    contract_id: contratoId,
    numero,
    origen: e.origen ?? "subida",
    nombre_archivo: e.nombreArchivo.slice(0, 200),
    storage_path: ruta,
    mime,
    sha256: createHash("sha256").update(e.datos).digest("hex"),
    tamano_bytes: e.datos.byteLength,
    texto_extraido: doc.texto,
    paginas: doc.paginas,
    paginas_virtuales: doc.paginasVirtuales,
    creado_por: e.usuario.id,
  });
  if (errVersion) throw new Error("No se pudo registrar la versión del contrato.");

  const { error: errSecciones } = await db.from("contract_sections").insert(
    doc.secciones.map((s) => ({
      org_id: org,
      version_id: versionId,
      orden: s.orden,
      tipo: s.tipo,
      etiqueta: s.etiqueta,
      titulo: s.titulo,
      texto: s.texto,
      inicio: s.inicio,
      fin: s.fin,
      pagina: s.pagina,
    })),
  );
  if (errSecciones) throw new Error("No se pudo guardar la estructura del contrato.");

  await db.from("contracts").update({ version_actual_id: versionId }).eq("id", contratoId);
  await db.from("audit_events").insert({
    org_id: org,
    contract_id: contratoId,
    actor_id: e.usuario.id,
    accion: numero > 1 ? "version_agregada" : e.origen === "plantilla" ? "contrato_generado" : "contrato_subido",
    detalle: {
      version: numero,
      archivo: e.nombreArchivo.slice(0, 200),
      clausulas: doc.secciones.filter((s) => s.tipo === "clausula").length,
      declaraciones: doc.secciones.filter((s) => s.tipo === "declaracion").length,
      paginas: doc.paginas,
    },
  });

  return { contratoId, versionId, numero };
}
