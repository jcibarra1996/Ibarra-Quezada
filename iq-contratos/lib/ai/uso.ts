import { registrar } from "@/lib/log";
import type { TareaIA } from "@/lib/env";

interface Uso {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

// Registra lo que gastó cada llamada a la IA, para medir el ahorro. Sin texto del contrato.
export function registrarUso(tarea: TareaIA, uso: Uso, extra: Record<string, string | number | null> = {}) {
  registrar("uso_ia", {
    tarea,
    entrada: uso.input_tokens,
    cache_escrita: uso.cache_creation_input_tokens ?? 0,
    cache_leida: uso.cache_read_input_tokens ?? 0,
    salida: uso.output_tokens,
    ...extra,
  });
}
