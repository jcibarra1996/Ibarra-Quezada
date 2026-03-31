/**
 * AlertsTable — muestra los hallazgos (Findings) con resumen e interpretación de IA.
 */

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Search,
} from "lucide-react";
import clsx from "clsx";

export interface Finding {
  id: number;
  keyword_id: number;
  bulletin_date: string | null;
  juzgado: string | null;
  expediente: string | null;
  raw_excerpt: string | null;
  ai_summary: string | null;
  ai_interpretation: string | null;
  status: "pending" | "found" | "not_found" | "error";
  created_at: string;
}

export interface Keyword {
  id: number;
  term: string;
  description: string | null;
}

interface Props {
  keywords: Keyword[];
  findings: Finding[];
  loadingFindings: boolean;
  onScan: (keywordId: number) => Promise<void>;
  onRefresh: () => void;
}

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  found: {
    label: "Encontrado",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700",
  },
  not_found: {
    label: "Sin resultados",
    icon: XCircle,
    className: "bg-gray-100 text-gray-500",
  },
  pending: {
    label: "Pendiente",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-700",
  },
  error: {
    label: "Error",
    icon: AlertCircle,
    className: "bg-red-100 text-red-600",
  },
};

function StatusBadge({ status }: { status: Finding["status"] }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.error;
  const Icon = cfg.icon;
  return (
    <span className={clsx("badge gap-1", cfg.className)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Expandable row ────────────────────────────────────────────────────────────

function FindingRow({ finding, keyword }: { finding: Finding; keyword?: Keyword }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded((x) => !x)}
      >
        <td className="px-4 py-3 text-sm">
          <StatusBadge status={finding.status} />
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          {keyword?.term ?? `ID ${finding.keyword_id}`}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {finding.juzgado || "—"}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 font-mono">
          {finding.expediente || "—"}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
          {finding.ai_summary || "—"}
        </td>
        <td className="px-4 py-3 text-sm text-gray-400">
          {finding.bulletin_date || "—"}
        </td>
        <td className="px-4 py-3 text-right">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400 inline" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 inline" />
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-blue-50 border-t border-blue-100">
          <td colSpan={7} className="px-6 py-4 space-y-4">
            {finding.ai_interpretation && (
              <div>
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">
                  Interpretacion legal (IA)
                </p>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {finding.ai_interpretation}
                </p>
              </div>
            )}
            {finding.raw_excerpt && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Extracto del boletin
                </p>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto font-mono">
                  {finding.raw_excerpt}
                </pre>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AlertsTable({
  keywords,
  findings,
  loadingFindings,
  onScan,
  onRefresh,
}: Props) {
  const [scanningId, setScanningId] = useState<number | null>(null);

  const keywordMap = Object.fromEntries(keywords.map((k) => [k.id, k]));

  async function handleScan(keywordId: number) {
    setScanningId(keywordId);
    try {
      await onScan(keywordId);
    } finally {
      setScanningId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Keywords list with scan buttons */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Términos vigilados ({keywords.length})
          </h2>
          <button className="btn-secondary text-xs" onClick={onRefresh}>
            <RefreshCw className="w-3 h-3" />
            Refrescar
          </button>
        </div>

        {keywords.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Aun no hay términos. Agrega uno arriba.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {keywords.map((kw) => (
              <div
                key={kw.id}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{kw.term}</p>
                  {kw.description && (
                    <p className="text-xs text-gray-400">{kw.description}</p>
                  )}
                </div>
                <button
                  className="btn-primary text-xs py-1.5"
                  onClick={() => handleScan(kw.id)}
                  disabled={scanningId === kw.id}
                >
                  {scanningId === kw.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                  {scanningId === kw.id ? "Escaneando..." : "Escanear hoy"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Findings / Alerts table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Alertas Judiciales
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Haz clic en una fila para ver la interpretacion completa de la IA
          </p>
        </div>

        {loadingFindings ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : findings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay hallazgos todavia. Ejecuta un escaneo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Estado", "Término", "Juzgado", "Expediente", "Resumen IA", "Fecha", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {findings.map((f) => (
                  <FindingRow
                    key={f.id}
                    finding={f}
                    keyword={keywordMap[f.keyword_id]}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
