"use client";
import { clienteNavegador } from "@/lib/supabase/navegador";

const LIMITE = 20 * 1024 * 1024;
// El almacenamiento solo acepta estos formatos; el tipo se toma de la extensión porque
// algunos sistemas no lo informan.
const TIPOS: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

// Sube el archivo directo al almacenamiento privado y regresa su ruta temporal.
export async function subirTemporal(archivo: File): Promise<string> {
  if (archivo.size > LIMITE) throw new Error("El archivo supera el límite de 20 MB.");
  if (/\.(heic|heif)$/i.test(archivo.name)) throw new Error("Las fotos HEIC del iPhone no son compatibles. Expórtela como JPG o PDF.");
  if (/\.doc$/i.test(archivo.name)) throw new Error("El formato .doc (Word 97-2003) no es compatible. Guarde el archivo como .docx o PDF.");
  const tipo = TIPOS[archivo.name.split(".").pop()?.toLowerCase() ?? ""];
  if (!tipo) throw new Error("Formato no compatible. Use PDF, Word (.docx) o imagen JPG/PNG.");
  const r = await fetch("/api/subidas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: archivo.name, tamano: archivo.size }),
  });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.error ?? "No fue posible preparar la subida.");
  const { error } = await clienteNavegador()
    .storage.from("contratos")
    .uploadToSignedUrl(cuerpo.ruta, cuerpo.token, archivo, { contentType: tipo });
  if (error) throw new Error("No fue posible subir el archivo. Revise su conexión e intente de nuevo.");
  return cuerpo.ruta as string;
}
