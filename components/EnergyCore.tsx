"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface EnergyCoreProps {
  completed: number;
  total: number;
}

/**
 * Reactor de energía: brilla e irradia color conforme se completan
 * tareas. Si la lista está llena y estancada (muchas pendientes, pocas
 * completadas), se ve opaco y agrietado.
 */
export function EnergyCore({ completed, total }: EnergyCoreProps) {
  const level = total === 0 ? 0.5 : completed / total;
  const stagnant = total >= 4 && level < 0.25;

  const color = useMemo(() => {
    if (stagnant) return "#4a4a55";
    if (level < 0.34) return "#00e5ff";
    if (level < 0.75) return "#39ff88";
    return "#c6ff00";
  }, [level, stagnant]);

  const glow = stagnant ? 0.15 : 0.35 + level * 0.65;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: color, filter: `blur(28px)` }}
        animate={{ opacity: stagnant ? [0.1, 0.15, 0.1] : [glow * 0.6, glow, glow * 0.6] }}
        transition={{ duration: stagnant ? 4 : 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <svg viewBox="0 0 200 200" className="relative h-full w-full">
        <circle
          cx="100"
          cy="100"
          r="86"
          fill="none"
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth="2"
        />
        <motion.circle
          cx="100"
          cy="100"
          r="86"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 86}
          animate={{
            strokeDashoffset: 2 * Math.PI * 86 * (1 - level),
          }}
          transition={{ type: "spring", stiffness: 90, damping: 16 }}
          transform="rotate(-90 100 100)"
        />

        <motion.circle
          cx="100"
          cy="100"
          r="54"
          fill={color}
          animate={
            stagnant
              ? { scale: 1 }
              : { scale: [1, 1.06, 1] }
          }
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "100px 100px", opacity: stagnant ? 0.35 : 0.9 }}
        />

        {stagnant && (
          <g stroke="#050507" strokeWidth="2.5" strokeLinecap="round" opacity={0.8}>
            <path d="M78 60 L92 96 L74 104 L104 148" fill="none" />
            <path d="M132 58 L112 92 L134 100 L108 142" fill="none" />
          </g>
        )}
      </svg>

      <div className="pointer-events-none absolute flex flex-col items-center">
        <span className="font-display text-3xl font-black" style={{ color }}>
          {completed}/{total}
        </span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
          {stagnant ? "estancado" : "energía hoy"}
        </span>
      </div>
    </div>
  );
}
