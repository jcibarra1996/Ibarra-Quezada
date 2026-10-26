"use client";
import { createElement, useEffect, useRef, useState } from "react";

// Componente oficial de firma de Mifiel (web component <mifiel-widget>). Muestra el
// contrato y la firma con e.firma del firmante sin salir del portal.
// Documentación: https://docs.mifiel.com (sección "Signing Widget") y @mifiel/widget.
const SCRIPT = "https://app.mifiel.com/widget-component/index.js";

function cargarScript(): Promise<void> {
  if (customElements.get("mifiel-widget")) return Promise.resolve();
  const existente = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
  const script = existente ?? Object.assign(document.createElement("script"), { type: "module", src: SCRIPT });
  if (!existente) document.head.appendChild(script);
  return Promise.race([
    customElements.whenDefined("mifiel-widget").then(() => undefined),
    new Promise<void>((_, rechazar) => script.addEventListener("error", () => rechazar(new Error("No se pudo cargar el componente de Mifiel.")))),
  ]);
}

export function WidgetMifiel({
  widgetId,
  entorno,
  alFirmar,
  alCerrar,
}: {
  widgetId: string;
  entorno: string;
  alFirmar: () => void;
  alCerrar: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    cargarScript()
      .then(() => vivo && setListo(true))
      .catch((e) => vivo && setError(e instanceof Error ? e.message : "No se pudo cargar el componente de Mifiel."));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    const el = ref.current as (HTMLElement & { successBtnAction?: () => void; errorBtnAction?: () => void }) | null;
    if (!listo || !el) return;
    el.successBtnAction = alCerrar;
    el.errorBtnAction = alCerrar;
    const exito = () => alFirmar();
    const fallo = () => setError("Mifiel no pudo completar la firma. Intente de nuevo o firme desde el correo de Mifiel.");
    el.addEventListener("signSuccess", exito);
    el.addEventListener("signError", fallo);
    return () => {
      el.removeEventListener("signSuccess", exito);
      el.removeEventListener("signError", fallo);
    };
  }, [listo, alFirmar, alCerrar]);

  if (error) return <p className="rounded-md bg-riesgo-suave px-3 py-2 text-[13px] text-riesgo">{error}</p>;
  if (!listo) return <p className="py-10 text-center text-[13px] text-secundario">Cargando el documento desde Mifiel...</p>;
  return createElement("mifiel-widget", {
    ref,
    id: widgetId,
    environment: entorno === "produccion" ? "production" : "sandbox",
    "success-btn-text": "Volver al contrato",
  });
}
