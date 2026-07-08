"use client";

import { motion } from "framer-motion";
import type { Context } from "@/lib/types";

export function ContextToggle({
  value,
  onChange,
}: {
  value: Context;
  onChange: (c: Context) => void;
}) {
  return (
    <div className="relative flex w-full rounded-2xl bg-panel p-1">
      <motion.div
        className={`absolute inset-y-1 w-1/2 rounded-xl ${
          value === "trabajo" ? "bg-trabajo shadow-neon" : "bg-casa shadow-neon-casa"
        }`}
        animate={{ x: value === "trabajo" ? 0 : "100%" }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
      {(["trabajo", "casa"] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`relative z-10 w-1/2 py-3 text-center font-display text-sm font-bold uppercase tracking-wide transition-colors ${
            value === c ? "text-void" : "text-white/60"
          }`}
        >
          {c === "trabajo" ? "Trabajo" : "Casa"}
        </button>
      ))}
    </div>
  );
}
