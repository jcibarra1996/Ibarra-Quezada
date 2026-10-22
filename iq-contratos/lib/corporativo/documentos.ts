import "server-only";
import { createHash, randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { clienteSistema } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/contratos/registrar";
import { TAMANO_MAXIMO } from "@/lib/parsing/extraer";
import { registrar, registrarError } from "@/lib/log";
import { detectarTipoCorporativo, leerDocumentoCorporativo } from "./extraer";
import { ErrorExtraccion } from "./esquema";
import { claveDenominacion, integrarDatos, type DatosExpediente, type FuentesExpediente, type TipoDocumento } from "./campos";
import type { Usuario } from "@/lib/tipos";

const EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Guarda un documento corporativo en almacenamiento privado, lo lee con la IA e integra
// los datos al expediente. Las escrituras son del sistema; el llamador ya verificó la sesión
// y que el expediente es de la organización del usuario.
export async function registrarDocumentoCorporativo(p: {
  usuario: Pick<Usuario, "id" | "org_id">;
  companyId: string;
  tipo: TipoDocumento;
  nombreArchivo: string;
  datos: Buffer;
  // La semilla registra documentos con datos ya conocidos, sin llamar a la API.
  extraccionConocida?: Awaited<ReturnType<typeof leerDocumentoCorporativo>>;
}) {
  if (p.datos.byteLength > TAMANO_MAXIMO) throw new ErrorExtraccion("El archivo supera el límite de 20 MB.");
  const mime = detectarTipoCorporativo(p.nombreArchivo, p.datos);
  const db = clienteSistema();
  const org = p.usuario.org_id;

  const { data: expediente } = await db.from("companies").select("id, denominacion").eq("id", p.companyId).eq("org_id", org).maybeSingle();
  if (!expediente) throw new ErrorExtraccion("Expediente no encontrado.");

  const id = randomUUID();
  const ruta = `${org}/expedientes/${expediente.id}/${id}.${EXTENSION[mime]}`;
  const subida = await db.storage.from(BUCKET).upload(ruta, p.datos, { contentType: mime, upsert: false });
  if (subida.error) throw new Error("No se pudo guardar el archivo en el almacenamiento privado.");

  const { error } = await db.from("corporate_documents").insert({
    id,
    org_id: org,
    company_id: expediente.id,
    tipo: p.tipo,
    nombre_archivo: p.nombreArchivo.slice(0, 200),
    storage_path: ruta,
    mime,
    sha256: createHash("sha256").update(p.datos).digest("hex"),
    tamano_bytes: p.datos.byteLength,
    creado_por: p.usuario.id,
  });
  if (error) throw new Error("No se pudo registrar el documento.");
  await db.from("audit_events").insert({
    org_id: org,
    company_id: expediente.id,
    actor_id: p.usuario.id,
    accion: "documento_corporativo_subido",
    detalle: { tipo: p.tipo, archivo: p.nombreArchivo.slice(0, 200) },
  });

  try {
    const { extraccion, modelo } =
      p.extraccionConocida ?? (await leerDocumentoCorporativo({ datos: p.datos, mime, tipoDeclarado: p.tipo, denominacion: expediente.denominacion }));

    // Se relee el expediente justo antes de integrar, por si otro documento terminó primero.
    const { data: actual } = await db.from("companies").select("datos, fuentes, rfc, estado").eq("id", expediente.id).single();
    const r = integrarDatos({
      datos: (actual?.datos ?? {}) as DatosExpediente,
      fuentes: (actual?.fuentes ?? {}) as FuentesExpediente,
      documento: { id, tipo: p.tipo },
      extraidos: extraccion.campos,
    });
    const observaciones = [...extraccion.observaciones];
    if (extraccion.denominacion && extraccion.tipo_documento !== "identificacion") {
      if (claveDenominacion(extraccion.denominacion) !== claveDenominacion(expediente.denominacion)) {
        observaciones.unshift(`El documento se refiere a "${extraccion.denominacion}", que no coincide con la denominación del expediente.`);
      }
    }
    if (extraccion.tipo_documento !== p.tipo && extraccion.tipo_documento !== "otro") {
      observaciones.unshift("El contenido no parece corresponder al tipo de documento que se indicó al cargarlo.");
    }
    const rfcNuevo = !actual?.rfc && extraccion.rfc ? extraccion.rfc : null;
    if (actual?.rfc && extraccion.rfc && actual.rfc !== extraccion.rfc) {
      observaciones.push(`El RFC del documento (${extraccion.rfc}) es distinto del registrado en el expediente (${actual.rfc}).`);
    }

    await db
      .from("corporate_documents")
      .update({
        estado: "completado",
        modelo,
        resumen: extraccion.resumen,
        datos_extraidos: { campos: extraccion.campos, observaciones, diferencias: r.diferencias, rfc: extraccion.rfc },
      })
      .eq("id", id);
    if (r.cambios.length || rfcNuevo) {
      // Un dato nuevo o distinto regresa el expediente a validación de Legal.
      await db
        .from("companies")
        .update({ datos: r.datos, fuentes: r.fuentes, estado: "por_validar", ...(rfcNuevo ? { rfc: rfcNuevo } : {}) })
        .eq("id", expediente.id);
    }
    registrar("documento_corporativo_leido", { org, expediente: expediente.id, documento: id, campos: extraccion.campos.length, cambios: r.cambios.length });
    return { documentoId: id, cambios: r.cambios.length, diferencias: r.diferencias.length };
  } catch (e) {
    const mensaje =
      e instanceof ErrorExtraccion
        ? e.message
        : e instanceof Anthropic.AuthenticationError
          ? "La llave de Anthropic no es válida."
          : e instanceof Anthropic.RateLimitError
            ? "Se alcanzó el límite de uso de la API. Intente en unos minutos."
            : e instanceof Error && e.message.startsWith("Falta la variable")
              ? e.message
              : "No fue posible leer el documento. Puede capturar los datos manualmente.";
    await db.from("corporate_documents").update({ estado: "error", error: mensaje }).eq("id", id);
    registrarError("documento_corporativo_fallido", e, { org, documento: id });
    return { documentoId: id, error: mensaje };
  }
}
