"use client";
import { useState } from "react";

// Registra en Mifiel los avisos que le dicen al portal cuándo se firmó un documento.
export function ConectarAvisos() {
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | string>("");
  return (
    <span className="flex items-center gap-2">
      <button
        className="font-medium text-mandarina-texto hover:underline disabled:opacity-50"
        disabled={estado === "enviando"}
        onClick={async () => {
          setEstado("enviando");
          const r = await fetch("/api/firmas/mifiel/conectar", { method: "POST" });
          const cuerpo = await r.json().catch(() => ({}));
          setEstado(r.ok ? "ok" : (cuerpo.error ?? "No fue posible conectar los avisos."));
        }}
      >
        Conectar avisos automáticos
      </button>
      {estado === "ok" && <span className="text-bajo">Avisos conectados</span>}
      {estado && estado !== "ok" && estado !== "enviando" && <span className="text-riesgo">{estado}</span>}
    </span>
  );
}
