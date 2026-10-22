import "server-only";
import { randomUUID } from "node:crypto";
import { clienteSistema } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/contratos/registrar";
import { TAMANO_MAXIMO } from "@/lib/parsing/extraer";
import type { Usuario } from "@/lib/tipos";

// Los archivos no pasan por las funciones de Vercel (que limitan cada solicitud a 4.5 MB):
// el navegador los sube directo al almacenamiento privado con un enlace firmado de un solo
// uso, a una carpeta temporal del usuario, y el servidor los recoge para procesarlos.

export class ErrorSubida extends Error {}

const carpeta = (u: Pick<Usuario, "id" | "org_id">) => `${u.org_id}/temporal/${u.id}/`;

export async function prepararSubida(usuario: Pick<Usuario, "id" | "org_id">, p: { nombre: string; tamano: number }) {
  if (!Number.isFinite(p.tamano) || p.tamano <= 0) throw new ErrorSubida("Seleccione un archivo.");
  if (p.tamano > TAMANO_MAXIMO) throw new ErrorSubida("El archivo supera el límite de 20 MB.");
  const extension = (p.nombre.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? "bin").toLowerCase();
  const ruta = `${carpeta(usuario)}${randomUUID()}.${extension}`;
  const { data, error } = await clienteSistema().storage.from(BUCKET).createSignedUploadUrl(ruta);
  if (error || !data) throw new Error("No se pudo preparar la subida.");
  return { ruta, token: data.token };
}

// Descarga el archivo temporal. Solo acepta rutas de la carpeta temporal del propio usuario.
export async function recogerSubida(usuario: Pick<Usuario, "id" | "org_id">, ruta: string): Promise<Buffer> {
  if (!ruta.startsWith(carpeta(usuario)) || ruta.includes("..")) throw new ErrorSubida("Archivo no válido.");
  const { data, error } = await clienteSistema().storage.from(BUCKET).download(ruta);
  if (error || !data) throw new ErrorSubida("No se encontró el archivo subido. Intente de nuevo.");
  if (data.size > TAMANO_MAXIMO) throw new ErrorSubida("El archivo supera el límite de 20 MB.");
  return Buffer.from(await data.arrayBuffer());
}

export async function descartarSubida(ruta: string) {
  await clienteSistema().storage.from(BUCKET).remove([ruta]);
}
