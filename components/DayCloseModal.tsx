"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fireHaptic } from "@/lib/haptics";
import { burstConfettiBig } from "@/lib/confetti";
import { tomorrowISO } from "@/lib/dateHelpers";
import type { DayCloseDecision, Task } from "@/lib/types";

type Action = DayCloseDecision["action"];

/**
 * Cierre Forzoso, 9:00 PM. Bloquea la pantalla hasta que cada tarea
 * pendiente tenga un destino decidido a mano — cero rollover automático.
 */
export function DayCloseModal({
  pendingTasks,
  onResolved,
}: {
  pendingTasks: Task[];
  onResolved: () => void;
}) {
  const [decisions, setDecisions] = useState<Record<string, DayCloseDecision>>({});
  const [customDates, setCustomDates] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const allDecided = pendingTasks.every((t) => decisions[t.id]);

  function decide(taskId: string, action: Action) {
    fireHaptic("light");
    if (action === "programar_fecha") {
      const date = customDates[taskId] || tomorrowISO();
      setDecisions((d) => ({ ...d, [taskId]: { taskId, action, date } }));
    } else {
      setDecisions((d) => ({
        ...d,
        [taskId]: action === "reprogramar_manana"
          ? { taskId, action: "reprogramar_manana" }
          : { taskId, action: "eliminar" },
      }));
    }
  }

  async function confirmClose() {
    setSubmitting(true);
    fireHaptic("medium");
    await fetch("/api/day-close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisions: Object.values(decisions) }),
    }).catch(() => {});
    burstConfettiBig();
    setSubmitting(false);
    onResolved();
  }

  async function escapeNoEnergy() {
    setSubmitting(true);
    fireHaptic("medium");
    await fetch("/api/day-close/escape", { method: "POST" }).catch(() => {});
    setSubmitting(false);
    onResolved();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col bg-void/98 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-1 px-6 pt-[calc(env(safe-area-inset-top)+28px)] pb-4">
        <h1 className="font-display text-2xl font-black tracking-wide text-warn">CIERRE DE DÍA</h1>
        <p className="text-sm text-white/50">
          {pendingTasks.length === 0
            ? "Todo resuelto. Cierra el día."
            : "Decide el destino de cada pendiente. No hay rollover automático."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {pendingTasks.map((task) => {
              const decided = decisions[task.id];
              return (
                <motion.li
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-2xl border-2 p-4 transition-colors ${
                    decided ? "border-ok/50 bg-ok/5" : "border-edge bg-panel"
                  }`}
                >
                  <p className="mb-3 text-sm font-semibold text-white">{task.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => decide(task.id, "reprogramar_manana")}
                      className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide ${
                        decided?.action === "reprogramar_manana"
                          ? "bg-trabajo text-void"
                          : "bg-edge text-white/70"
                      }`}
                    >
                      Mañana
                    </button>
                    <button
                      onClick={() => decide(task.id, "programar_fecha")}
                      className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide ${
                        decided?.action === "programar_fecha"
                          ? "bg-casa text-void"
                          : "bg-edge text-white/70"
                      }`}
                    >
                      Programar
                    </button>
                    {decided?.action === "programar_fecha" && (
                      <input
                        type="date"
                        defaultValue={tomorrowISO()}
                        min={tomorrowISO()}
                        onChange={(e) =>
                          setDecisions((d) => ({
                            ...d,
                            [task.id]: { taskId: task.id, action: "programar_fecha", date: e.target.value },
                          }))
                        }
                        className="rounded-xl bg-edge px-2 py-2 text-xs text-white"
                      />
                    )}
                    <button
                      onClick={() => decide(task.id, "eliminar")}
                      className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide ${
                        decided?.action === "eliminar" ? "bg-warn text-void" : "bg-edge text-white/70"
                      }`}
                    >
                      Eliminar
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>

      <div className="flex flex-col gap-3 px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-2">
        <motion.button
          type="button"
          disabled={!allDecided || submitting}
          onClick={confirmClose}
          whileTap={{ scale: 0.96 }}
          className="w-full rounded-2xl bg-acid py-4 font-display text-lg font-black text-void shadow-neon-acid disabled:opacity-30"
        >
          CERRAR EL DÍA
        </motion.button>

        <button
          type="button"
          onClick={escapeNoEnergy}
          disabled={submitting}
          className="w-full py-2 text-center text-sm font-medium text-white/40 underline decoration-dotted underline-offset-4"
        >
          Hoy no tengo energía
        </button>
      </div>
    </motion.div>
  );
}
