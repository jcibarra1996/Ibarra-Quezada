"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fireHaptic } from "@/lib/haptics";
import { burstConfettiBig } from "@/lib/confetti";
import type { Context } from "@/lib/types";

export function MagicComplete({ token, context }: { token: string; context: Context }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function complete() {
    if (state === "busy" || state === "done") return;
    setState("busy");

    const res = await fetch(`/api/magic/${token}/complete`, { method: "POST" }).catch(() => null);

    if (res?.ok) {
      fireHaptic("success");
      burstConfettiBig();
      setState("done");
    } else {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <motion.p
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-lg font-bold text-ok"
      >
        ¡Listo! Gracias 🙌
      </motion.p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        type="button"
        onClick={complete}
        whileTap={{ scale: 0.9 }}
        disabled={state === "busy"}
        className={`rounded-2xl px-10 py-5 font-display text-xl font-black text-void shadow-neon ${
          context === "trabajo" ? "bg-trabajo" : "bg-casa"
        } disabled:opacity-50`}
      >
        {state === "busy" ? "..." : "LISTO ✓"}
      </motion.button>
      {state === "error" && (
        <p className="text-sm text-warn">Ya estaba resuelta, o el link expiró.</p>
      )}
    </div>
  );
}
