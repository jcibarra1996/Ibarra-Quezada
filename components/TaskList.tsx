"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/lib/types";

export function TaskList({
  tasks,
  onCompleted,
}: {
  tasks: Task[];
  onCompleted: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-2 py-16 text-center"
      >
        <span className="text-4xl">✦</span>
        <p className="text-sm text-white/40">Tablero limpio. Sin ruido.</p>
      </motion.div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onCompleted={onCompleted} />
        ))}
      </AnimatePresence>
    </ul>
  );
}
