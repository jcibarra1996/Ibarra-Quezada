/**
 * Dashboard principal — LegalTech Judicial Monitor
 *
 * Flujo:
 *   1. Cargar keywords del usuario.
 *   2. Cargar findings existentes.
 *   3. Permitir agregar nuevos términos (KeywordForm).
 *   4. Disparar scan manual por término (AlertsTable).
 *   5. Mostrar hallazgos con interpretación de IA.
 */

import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import { Scale, Bell } from "lucide-react";
import KeywordForm from "../components/KeywordForm";
import AlertsTable, { Finding, Keyword } from "../components/AlertsTable";

const API = "/api/v1";
const DEFAULT_USER_ID = 1;

export default function Dashboard() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchKeywords = useCallback(async () => {
    try {
      const res = await fetch(`${API}/keywords/?user_id=${DEFAULT_USER_ID}`);
      if (res.ok) setKeywords(await res.json());
    } catch {
      // silent — show stale data
    }
  }, []);

  const fetchFindings = useCallback(async () => {
    setLoadingFindings(true);
    try {
      const res = await fetch(`${API}/findings/`);
      if (res.ok) setFindings(await res.json());
    } catch {
      // silent
    } finally {
      setLoadingFindings(false);
    }
  }, []);

  useEffect(() => {
    fetchKeywords();
    fetchFindings();
  }, [fetchKeywords, fetchFindings]);

  // ── Scan handler ───────────────────────────────────────────────────────────

  async function handleScan(keywordId: number) {
    setScanMessage(null);
    try {
      const res = await fetch(`${API}/scan/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword_id: keywordId }),
      });
      const data = await res.json();
      setScanMessage(data.message ?? "Escaneo completado.");
      await fetchFindings();
    } catch {
      setScanMessage("Error al ejecutar el escaneo.");
    }

    // Auto-hide message after 5s
    setTimeout(() => setScanMessage(null), 5000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>LegalTech Monitor — Vigilancia Judicial CDMX</title>
        <meta
          name="description"
          content="Plataforma de monitoreo automatizado de boletines judiciales de la Ciudad de México"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                LegalTech Monitor
              </h1>
              <p className="text-xs text-gray-400">
                Vigilancia Judicial CDMX — Powered by Claude AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Bell className="w-4 h-4" />
            <span className="font-medium text-gray-700">
              {findings.filter((f) => f.status === "found").length}
            </span>
            <span>alerta(s)</span>
          </div>
        </div>
      </header>

      {/* Scan notification banner */}
      {scanMessage && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800 text-center">
          {scanMessage}
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Términos vigilados",
              value: keywords.length,
              color: "text-blue-600",
            },
            {
              label: "Alertas activas",
              value: findings.filter((f) => f.status === "found").length,
              color: "text-green-600",
            },
            {
              label: "Boletines escaneados",
              value: [
                ...new Set(findings.map((f) => f.bulletin_date).filter(Boolean)),
              ].length,
              color: "text-purple-600",
            },
            {
              label: "Sin resultados",
              value: findings.filter((f) => f.status === "not_found").length,
              color: "text-gray-400",
            },
          ].map((stat) => (
            <div key={stat.label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: keyword form */}
          <div className="lg:col-span-1">
            <KeywordForm onCreated={fetchKeywords} />

            <div className="mt-4 card p-4 bg-blue-50 border-blue-100">
              <p className="text-xs font-semibold text-blue-800 mb-1">
                Como funciona
              </p>
              <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                <li>Agrega el nombre o razon social a vigilar</li>
                <li>Haz clic en "Escanear hoy" para analizar el boletin del dia</li>
                <li>La IA resume e interpreta cada mencion encontrada</li>
                <li>Expande cualquier alerta para ver la interpretacion completa</li>
              </ol>
            </div>
          </div>

          {/* Right: alerts table */}
          <div className="lg:col-span-2">
            <AlertsTable
              keywords={keywords}
              findings={findings}
              loadingFindings={loadingFindings}
              onScan={handleScan}
              onRefresh={() => {
                fetchKeywords();
                fetchFindings();
              }}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        LegalTech Monitor MVP — Boletín Judicial CDMX &copy; {new Date().getFullYear()}
      </footer>
    </>
  );
}
