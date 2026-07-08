"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fireHaptic } from "@/lib/haptics";
import { burstConfettiBig } from "@/lib/confetti";
import type { WeeklyReward } from "@/lib/types";

const SKINS: Record<string, { label: string; color: string }> = {
  cian: { label: "Estampa Cian", color: "#00e5ff" },
  magenta: { label: "Estampa Magenta", color: "#ff2fd0" },
  acido: { label: "Estampa Ácido", color: "#c6ff00" },
  menta: { label: "Estampa Menta", color: "#39ff88" },
};

export function EnvelopeReward({ reward: initial }: { reward: WeeklyReward }) {
  const [reward, setReward] = useState(initial);
  const [opening, setOpening] = useState(false);

  if (reward.revealed) return null;

  async function open() {
    if (opening) return;
    setOpening(true);
    fireHaptic("medium");

    const res = await fetch("/api/weekly-reward/reveal", { method: "POST" }).catch(() => null);
    if (res?.ok) {
      const { reward: updated } = await res.json();
      setTimeout(() => {
        fireHaptic("success");
        burstConfettiBig();
        setReward(updated);
      }, 350);
    } else {
      setOpening(false);
    }
  }

  const skin = reward.skin_id ? SKINS[reward.skin_id] : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-void/90 backdrop-blur-md"
    >
      <div className="flex flex-col items-center gap-6 px-8 text-center">
        <p className="font-display text-lg uppercase tracking-[0.3em] text-white/50">
          Recompensa semanal
        </p>

        <AnimatePresence mode="wait">
          {!reward.revealed || !skin ? (
            <motion.button
              key="closed"
              type="button"
              onClick={open}
              animate={
                opening
                  ? { rotate: [0, -4, 4, -3, 3, 0], scale: [1, 1.08, 0.95, 1] }
                  : { y: [0, -6, 0] }
              }
              transition={
                opening
                  ? { duration: 0.5 }
                  : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              }
              whileTap={{ scale: 0.94 }}
              className="flex h-40 w-52 items-center justify-center rounded-2xl border-2 border-acid bg-panel text-5xl shadow-neon-acid"
            >
              ✉️
            </motion.button>
          ) : (
            <motion.div
              key="open"
              initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="flex h-40 w-52 flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-panel"
              style={{ borderColor: skin.color, boxShadow: `0 0 30px ${skin.color}88` }}
            >
              <div className="h-14 w-14 rounded-full" style={{ backgroundColor: skin.color }} />
              <span className="text-sm font-bold text-white">{skin.label}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="max-w-[240px] text-xs text-white/40">
          Toca el sobre. Más del 80% de efectividad esta semana — te lo ganaste.
        </p>
      </div>
    </motion.div>
  );
}
