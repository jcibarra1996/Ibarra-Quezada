/**
 * KeywordForm — formulario para agregar nombres / razones sociales a vigilar.
 */

import { useState, FormEvent } from "react";
import { PlusCircle, Loader2 } from "lucide-react";

interface Props {
  onCreated: () => void; // callback para refrescar la lista
}

const DEFAULT_USER_ID = 1; // MVP: usuario fijo; reemplazar con auth real

export default function KeywordForm({ onCreated }: Props) {
  const [term, setTerm] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = term.trim();
    if (!trimmed) {
      setError("Ingresa un nombre o razón social.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/keywords/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: trimmed,
          description: description.trim() || null,
          user_id: DEFAULT_USER_ID,
        }),
      });

      if (res.status === 409) {
        setError("Ese término ya está en tu lista de vigilancia.");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? "Error al crear keyword.");
        return;
      }

      setTerm("");
      setDescription("");
      onCreated();
    } catch {
      setError("No se pudo conectar al servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Agregar nombre a vigilar
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre o Razón Social *
          </label>
          <input
            className="input"
            type="text"
            placeholder="Ej. CONSTRUCTORA IBARRA QUEZADA S.A. DE C.V."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción / Referencia interna (opcional)
          </label>
          <input
            className="input"
            type="text"
            placeholder="Ej. Cliente principal, caso 2024-001"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PlusCircle className="w-4 h-4" />
          )}
          {loading ? "Agregando..." : "Agregar a vigilancia"}
        </button>
      </form>
    </div>
  );
}
