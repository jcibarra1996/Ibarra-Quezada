import "server-only";
import { clienteSistema } from "@/lib/supabase/admin";
import { registrarContrato } from "@/lib/contratos/registrar";
import { textoADocx } from "@/lib/docx/desde-texto";
import { llenarPlantilla, type CampoNegocio, type ParteLlenado, type RolPlantilla } from "./llenar";
import type { DatosExpediente, TipoPersona } from "@/lib/corporativo/campos";
import type { Usuario } from "@/lib/tipos";

export class ErrorPlantilla extends Error {}

// Genera el contrato a partir de una plantilla y lo registra como versión 1, con el mismo
// proceso que una subida (almacenamiento privado, texto y cláusulas). Queda "Recibido"
// para que Legal lo revise; la IA verifica las declaraciones contra los expedientes.
export async function generarDesdePlantilla(p: {
  usuario: Usuario;
  plantillaId: string;
  contraparteId: string | null;
  propiaId: string | null;
  negocio: Record<string, string>;
  lugarFirma: string;
  fechaFirma: string | null;
  areaId: string | null;
}) {
  const db = clienteSistema();
  const org = p.usuario.org_id;
  const { data: plantilla } = await db.from("templates").select("*").eq("id", p.plantillaId).eq("org_id", org).eq("activa", true).maybeSingle();
  if (!plantilla) throw new ErrorPlantilla("Plantilla no encontrada.");
  const ids = [p.contraparteId, p.propiaId].filter(Boolean) as string[];
  const { data: expedientes } = ids.length
    ? await db.from("companies").select("id, denominacion, rfc, tipo_persona, datos, es_propia").eq("org_id", org).in("id", ids)
    : { data: [] };
  const contraparte = expedientes?.find((e) => e.id === p.contraparteId && !e.es_propia) ?? null;
  const propia = expedientes?.find((e) => e.id === p.propiaId && e.es_propia) ?? null;
  if (!contraparte) throw new ErrorPlantilla("Seleccione el expediente de la contraparte.");

  const roles = plantilla.roles as RolPlantilla[];
  const campos = plantilla.campos as CampoNegocio[];
  const aParte = (e: typeof propia): ParteLlenado | null =>
    e ? { denominacion: e.denominacion, rfc: e.rfc, tipo_persona: e.tipo_persona as TipoPersona, datos: e.datos as DatosExpediente } : null;
  const partes = Object.fromEntries(roles.map((r) => [r.clave, r.propia ? aParte(propia) : aParte(contraparte)]));
  const negocio = Object.fromEntries(campos.map((c) => [c.clave, String(p.negocio[c.clave] ?? "").slice(0, 4000)]));
  const llenado = llenarPlantilla({ cuerpo: plantilla.cuerpo, roles, campos, partes, negocio, lugarFirma: p.lugarFirma.slice(0, 200), fechaFirma: p.fechaFirma });

  const datos = await textoADocx(llenado.texto, plantilla.nombre);
  const { contratoId } = await registrarContrato({
    usuario: p.usuario,
    nombreArchivo: `${plantilla.nombre} - ${contraparte.denominacion}.docx`.replace(/[\\/:*?"<>|]/g, " ").slice(0, 180),
    datos,
    origen: "plantilla",
    contraparte: contraparte.denominacion,
    contraparteId: contraparte.id,
    propiaId: propia?.id ?? null,
    plantillaId: plantilla.id,
    tipoContrato: plantilla.tipo_contrato,
    areaId: p.areaId,
    solicitud: { plantilla: plantilla.nombre, version_plantilla: plantilla.version, negocio, faltantes: llenado.faltantes },
  });
  return { contratoId, faltantes: llenado.faltantes };
}
