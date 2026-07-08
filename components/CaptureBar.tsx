"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ContextToggle } from "./ContextToggle";
import { fireHaptic } from "@/lib/haptics";
import type { Context, Task } from "@/lib/types";

export function CaptureBar({ onCreated }: { onCreated: (task: Task) => void }) {
  const [text, setText] = useState("");
  const [context, setContext] = useState<Context>("casa");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const title = text.trim();
    if (!title || busy) return;

    setBusy(true);
    setText("");
    fireHaptic("light");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, context }),
      });
      if (res.ok) {
        const { task } = await res.json();
        onCreated(task);
      } else {
        setText(title);
      }
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <motion.input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Escupe la idea..."
        enterKeyHint="done"
        whileFocus={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 24 }}
        className="w-full rounded-2xl border-2 border-edge bg-panel px-5 py-5 text-lg font-medium text-white placeholder:text-white/30 outline-none focus:border-white/40"
      />

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ContextToggle value={context} onChange={setContext} />
        </div>
        <motion.button
          type="button"
          onClick={submit}
          disabled={!text.trim() || busy}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="flex h-[52px] w-[68px] shrink-0 items-center justify-center rounded-2xl bg-acid font-display text-2xl font-black text-void shadow-neon-acid disabled:opacity-30"
        >
          +
        </motion.button>
      </div>
    </div>
  );
}
