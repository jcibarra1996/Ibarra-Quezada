"use client";

import { motion } from "framer-motion";
import { CaptureBar } from "./CaptureBar";
import type { Task } from "@/lib/types";

/**
 * 8:45 AM — si aún no hay ningún registro hoy, bloquea la pantalla con
 * "¿Qué vamos a destruir hoy?" hasta que se agregue una tarea.
 */
export function MorningLockModal({ onCreated }: { onCreated: (task: Task) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-void px-6"
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="h-14 w-14 rounded-full bg-warn shadow-neon"
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-2xl font-black text-white">
          ¿QUÉ VAMOS A DESTRUIR HOY?
        </h1>
        <p className="max-w-xs text-sm text-white/50">
          Sin plan de ataque no hay pantalla. Agrega al menos una tarea para continuar.
        </p>
      </div>
      <div className="w-full max-w-md">
        <CaptureBar onCreated={onCreated} />
      </div>
    </motion.div>
  );
}
