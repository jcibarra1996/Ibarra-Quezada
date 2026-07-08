"use client";

import { motion } from "framer-motion";
import { burstConfettiAt } from "@/lib/confetti";
import { fireHaptic } from "@/lib/haptics";
import type { Task } from "@/lib/types";

const CONTEXT_STYLES = {
  trabajo: { border: "border-trabajo/60", text: "text-trabajo", glow: "shadow-neon" },
  casa: { border: "border-casa/60", text: "text-casa", glow: "shadow-neon-casa" },
};

export function TaskCard({
  task,
  onCompleted,
}: {
  task: Task;
  onCompleted: (id: string) => void;
}) {
  const style = CONTEXT_STYLES[task.context];

  async function handleComplete(e: React.MouseEvent<HTMLButtonElement>) {
    burstConfettiAt(e.clientX, e.clientY, task.context);
    fireHaptic("success");
    onCompleted(task.id); // optimista: la tarjeta desaparece de inmediato

    await fetch(`/api/tasks/${task.id}/complete`, { method: "POST" }).catch(() => {});
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/t/${task.share_token}`
      : `/t/${task.share_token}`;

  function shareOnWhatsApp() {
    const message = `¿Me ayudas con esto? "${task.title}" → ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, x: 40 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className={`flex items-center gap-3 rounded-2xl border-2 bg-panel p-4 ${style.border}`}
    >
      <div className="flex-1">
        <p className="text-base font-semibold leading-snug text-white">{task.title}</p>
        <span className={`text-[11px] font-bold uppercase tracking-wider ${style.text}`}>
          {task.context}
        </span>
      </div>

      <motion.button
        type="button"
        onClick={shareOnWhatsApp}
        whileTap={{ scale: 0.85, rotate: -8 }}
        aria-label="Delegar por WhatsApp"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-edge text-lg text-white/70 active:bg-white/10"
      >
        ↗
      </motion.button>

      <motion.button
        type="button"
        onClick={handleComplete}
        whileTap={{ scale: 0.82 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/5 text-2xl font-black ${style.text} ${style.glow} border-2 ${style.border} active:bg-white/10`}
      >
        ✓
      </motion.button>
    </motion.li>
  );
}
