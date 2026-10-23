"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { subirTemporal } from "@/lib/subir-archivo";
import { fechaHora } from "@/lib/formato";
import type { SolicitudFirma } from "@/lib/revision/cargar";
import type { EstadoContrato } from "@/lib/tipos";

interface Fila {
  nombre: string;
  correo: string;
  rfc: string;
  parte?: string;
}

// Firma electrónica con Mifiel: enviar el PDF final, seguir a los firmantes y descargar
// el contrato firmado con su constancia de conservación (NOM-151).
export function FirmaElectronica({
  contratoId,
  estado,
  solicitudes,
  configurado,
  versionEsPdf,
  sugeridos,
}: {
  contratoId: string;
  estado: EstadoContrato;
  solicitudes: SolicitudFirma[];
  configurado: boolean;
  versionEsPdf: boolean;
  sugeridos: Fila[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [filas, setFilas] = useState<Fila[]>(sugeridos.length ? sugeridos : [{ nombre: "", correo: "", rfc: "" }]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const activa = solicitudes.find((s) => s.estado === "enviado");
  const firmada = solicitudes.find((s) => s.estado === "firmado");
  const ultima = solicitudes[0];

  async function enviar() {
    setTrabajando(true);
    setMensaje("");
    try {
      const ruta = archivo ? await subirTemporal(archivo) : null;
      const r = await fetch(`/api/contratos/${contratoId}/firma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruta, nombre: archivo?.name ?? null, firmantes: filas }),
      });
      const cuerpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(cuerpo.error ?? "No fue posible enviar a firma.");
      setAbierto(false);
      router.refresh();
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "No fue posible enviar a firma.");
    } finally {
      setTrabajando(false);
    }
  }

  async function actualizar(id: string) {
    setTrabajando(true);
    setMensaje("");
    const r = await fetch(`/api/firmas/${id}/actualizar`, { method: "POST" });
    const cuerpo = await r.json().catch(() => ({}));
    setTrabajando(false);
    if (!r.ok) return setMensaje(cuerpo.error ?? "No fue posible consultar a Mifiel.");
    if (cuerpo.estado === "enviado") setMensaje(`Siguen pendientes firmas: ${cuerpo.firmaron ?? 0} de ${cuerpo.total ?? 0} firmaron.`);
    router.refresh();
  }

  if (firmada) {
    return (
      <span className="flex items-center gap-2 text-[12.5px]">
        <span className="rounded-full bg-bajo-suave px-2.5 py-1 font-medium text-bajo">Firmado con Mifiel</span>
        <a className="text-terracota hover:underline" href={`/api/firmas/${firmada.id}/archivo?formato=pdf`}>
          PDF firmado
        </a>
        {firmada.firmado_xml_path && (
          <a className="text-terracota hover:underline" href={`/api/firmas/${firmada.id}/archivo?formato=xml`} title="XML con la constancia de conservación NOM-151">
            XML (NOM-151)
          </a>
        )}
      </span>
    );
  }

  if (activa) {
    const firmaron = activa.firmantes.filter((f) => f.firmado).length;
    return (
      <span className="relative">
        <Boton onClick={() => setAbierto(!abierto)}>
          En firma con Mifiel · {firmaron} de {activa.firmantes.length}
        </Boton>
        {abierto && (
          <div className="absolute right-0 top-11 z-40 w-[360px] rounded-xl border border-linea bg-white p-4 shadow-[var(--shadow-flotante)]">
            <p className="text-[13px] font-semibold">Firmantes</p>
            <ul className="mt-2 space-y-1.5">
              {activa.firmantes.map((f) => (
                <li key={f.correo} className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="min-w-0 truncate">
                    {f.nombre} <span className="text-secundario">{f.correo}</span>
                  </span>
                  <span className={f.firmado ? "text-bajo" : "text-secundario"}>{f.firmado ? "Firmó" : "Pendiente"}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11.5px] text-secundario">
              Enviado {fechaHora(activa.creado_en)}
              {activa.entorno === "sandbox" ? " · ambiente de pruebas de Mifiel (sin validez legal)" : ""}. Mifiel envió las invitaciones por correo.
            </p>
            {mensaje && <p className="mt-2 text-[12px] text-medio">{mensaje}</p>}
            <Boton className="mt-3 w-full" disabled={trabajando} onClick={() => actualizar(activa.id)}>
              {trabajando ? "Consultando a Mifiel..." : "Actualizar estado"}
            </Boton>
          </div>
        )}
      </span>
    );
  }

  if (estado === "firmado") return null;
  if (estado !== "aprobado") {
    // Visible desde el inicio de la revisión, para que Legal sepa que la firma será electrónica.
    return (
      <span className="relative">
        <Boton onClick={() => setAbierto(!abierto)}>Firmar con Mifiel</Boton>
        {abierto && (
          <div className="absolute right-0 top-11 z-40 w-[340px] rounded-xl border border-linea bg-white p-4 text-[12.5px] shadow-[var(--shadow-flotante)]">
            <p className="text-[13px] font-semibold">Firma electrónica con Mifiel</p>
            <p className="mt-1.5 leading-relaxed text-secundario">
              Se habilita cuando Legal aprueba el contrato: cambie el estado a <span className="font-medium text-tinta">Aprobado</span> (sin hallazgos de riesgo alto pendientes) y
              aquí mismo podrá enviarlo a firma con la e.firma de cada firmante.
            </p>
            {!configurado && <p className="mt-2 rounded bg-medio-suave px-2 py-1.5 text-medio">Mifiel aún no está conectado; vea las instrucciones en Firmas.</p>}
          </div>
        )}
      </span>
    );
  }
  const control = "h-8 w-full rounded-md border border-linea-fuerte bg-white px-2 text-[12.5px] outline-none focus:border-terracota";
  return (
    <>
      <Boton variante="primario" onClick={() => setAbierto(true)}>
        Firmar con Mifiel
      </Boton>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/30 px-4" onClick={() => !trabajando && setAbierto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[640px] rounded-xl border border-linea bg-white p-6 shadow-[var(--shadow-flotante)]" role="dialog" aria-modal aria-labelledby="titulo-firma">
            <h2 id="titulo-firma" className="titulo text-[20px]">Enviar a firma electrónica con Mifiel</h2>
            <p className="mt-1 text-[13px] text-secundario">
              Cada firmante recibe un correo de Mifiel y firma con su e.firma del SAT. Al completarse, el portal guarda el PDF firmado y el XML con la constancia de
              conservación (NOM-151) y marca el contrato como firmado.
            </p>
            {!configurado && (
              <p className="mt-3 rounded-md bg-medio-suave px-3 py-2 text-[12.5px] text-medio">
                Mifiel aún no está conectado. La dirección jurídica lo conecta desde Firmas con el APP_ID y el APP_SECRET de la cuenta de la empresa.
              </p>
            )}
            {ultima?.estado === "error" || ultima?.estado === "rechazado" ? (
              <p className="mt-3 rounded-md bg-burgundy-suave px-3 py-2 text-[12.5px] text-burgundy">
                El envío anterior terminó como {ultima.estado === "rechazado" ? "rechazado por un firmante" : "error"}. Puede enviarlo de nuevo.
              </p>
            ) : null}

            <p className="mb-1.5 mt-4 text-[12px] font-semibold uppercase tracking-wider text-secundario">Firmantes</p>
            <div className="space-y-2">
              {filas.map((f, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_140px_24px] items-center gap-2">
                  <input aria-label="Nombre completo" placeholder="Nombre completo" value={f.nombre} onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))} className={control} />
                  <input aria-label="Correo" placeholder="correo@empresa.com" type="email" value={f.correo} onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, correo: e.target.value } : x)))} className={control} />
                  <input aria-label="RFC del firmante (opcional)" placeholder="RFC (opcional)" value={f.rfc} maxLength={13} onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, rfc: e.target.value.toUpperCase() } : x)))} className={`${control} font-mono`} />
                  <button type="button" aria-label="Quitar firmante" className="text-secundario hover:text-burgundy" onClick={() => setFilas(filas.filter((_, j) => j !== i))}>
                    ×
                  </button>
                  {f.parte && <span className="col-span-4 -mt-1 text-[11px] text-secundario">Representante de {f.parte}, según su expediente</span>}
                </div>
              ))}
            </div>
            <button type="button" className="mt-2 text-[12.5px] font-medium text-terracota hover:underline" onClick={() => setFilas([...filas, { nombre: "", correo: "", rfc: "" }])}>
              Agregar firmante
            </button>
            <p className="mt-1 text-[11.5px] text-secundario">El RFC es el de la persona que firma (el de su e.firma), no el de la empresa.</p>

            <p className="mb-1.5 mt-4 text-[12px] font-semibold uppercase tracking-wider text-secundario">Documento</p>
            <p className="text-[12.5px] text-secundario">
              {versionEsPdf ? "Se enviará la versión vigente (PDF). Si tiene un PDF final distinto, cárguelo aquí." : "Mifiel firma archivos PDF. Cargue el PDF final del contrato."}
            </p>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="mt-2 block w-full text-[12.5px] text-secundario file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:border file:border-linea-fuerte file:bg-white file:px-3 file:text-[12.5px] file:font-medium file:text-tinta hover:file:bg-gris-50"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />

            {mensaje && <p className="mt-3 text-[13px] text-burgundy">{mensaje}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Boton variante="fantasma" disabled={trabajando} onClick={() => setAbierto(false)}>
                Cancelar
              </Boton>
              <Boton variante="primario" disabled={trabajando || !configurado || (!versionEsPdf && !archivo)} onClick={enviar}>
                {trabajando ? "Enviando a Mifiel..." : "Enviar a firma"}
              </Boton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
