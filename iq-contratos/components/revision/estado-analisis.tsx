"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Boton } from "@/components/ui/boton";

// Lanza el análisis cuando el contrato aún no lo tiene y espera a que termine.
export function EstadoAnalisis({
  contratoId,
  estado,
  error,
  autoIniciar,
  puedeReintentar,
}: {
  contratoId: string;
  estado: "sin_analisis" | "en_proceso" | "error";
  error?: string | null;
  autoIniciar: boolean;
  puedeReintentar: boolean;
}) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState(estado === "en_proceso");
  const [fallo, setFallo] = useState<string | null>(estado === "error" ? error ?? "No fue posible completar el análisis." : null);
  const lanzado = useRef(false);

  async function analizar() {
    setTrabajando(true);
    setFallo(null);
    const r = await fetch(`/api/contratos/${contratoId}/analizar`, { method: "POST" });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      setTrabajando(false);
      setFallo(cuerpo.error ?? "No fue posible completar el análisis.");
      return;
    }
    if (r.status === 202) return; // otro análisis está en curso; se espera con el sondeo
    router.refresh();
  }

  useEffect(() => {
    if (autoIniciar && estado === "sin_analisis" && !lanzado.current) {
      lanzado.current = true;
      void analizar();
    }
  }, []);

  // Mientras hay un análisis en proceso, se consulta de nuevo cada 5 segundos.
  useEffect(() => {
    if (!trabajando) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [trabajando, router]);

  if (trabajando) {
    return (
      <div className="rounded-lg border border-linea bg-lienzo p-4">
        <div className="mb-3 h-1 overflow-hidden rounded bg-gris-100">
          <div className="h-full w-1/3 animate-[avance_1.6s_ease-in-out_infinite] rounded bg-terracota" />
        </div>
        <p className="text-[13.5px] font-medium">La IA está haciendo la primera lectura</p>
        <p className="mt-1 text-[12.5px] text-secundario">
          Identifica el tipo y objeto del contrato, compara cada cláusula con el playbook y verifica que cada cita exista en el documento. Suele tardar entre uno y tres minutos.
        </p>
      </div>
    );
  }
  if (fallo) {
    return (
      <div className="rounded-lg border border-burgundy/30 bg-burgundy-suave p-4">
        <p className="text-[13.5px] font-medium text-burgundy">El análisis no se completó</p>
        <p className="mt-1 text-[12.5px] text-burgundy">{fallo}</p>
        {puedeReintentar && (
          <Boton className="mt-3" onClick={analizar}>
            Intentar de nuevo
          </Boton>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-linea bg-lienzo p-4">
      <p className="text-[13px] text-secundario">Este contrato aún no tiene análisis.</p>
      {puedeReintentar && (
        <Boton variante="primario" className="mt-3" onClick={analizar}>
          Analizar con IA
        </Boton>
      )}
    </div>
  );
}
