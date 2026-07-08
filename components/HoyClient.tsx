"use client";

import { useEffect, useState } from "react";
import { EnergyCore } from "./EnergyCore";
import { CaptureBar } from "./CaptureBar";
import { TaskList } from "./TaskList";
import { DayCloseModal } from "./DayCloseModal";
import { EnvelopeReward } from "./EnvelopeReward";
import { MorningLockModal } from "./MorningLockModal";
import { isPastCloseTime, isPastMorningLockTime } from "@/lib/dateHelpers";
import type { Task, WeeklyReward } from "@/lib/types";

export function HoyClient({
  initialTasks,
  dayAlreadyClosed,
  weeklyReward,
}: {
  initialTasks: Task[];
  dayAlreadyClosed: boolean;
  weeklyReward: WeeklyReward | null;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dayClosed, setDayClosed] = useState(dayAlreadyClosed);
  const [pastCloseTime, setPastCloseTime] = useState(isPastCloseTime());
  const [pastMorningLock, setPastMorningLock] = useState(isPastMorningLockTime());

  useEffect(() => {
    const id = setInterval(() => {
      setPastCloseTime(isPastCloseTime());
      setPastMorningLock(isPastMorningLockTime());
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  function handleCreated(task: Task) {
    setTasks((prev) => [task, ...prev]);
  }

  function handleCompleted(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "completed" as const } : t)));
  }

  function handleDayCloseResolved() {
    setTasks((prev) => prev.filter((t) => t.status !== "pending"));
    setDayClosed(true);
  }

  const showDayClose = pastCloseTime && !dayClosed;
  const showMorningLock = !showDayClose && pastMorningLock && tasks.length === 0;

  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 px-5 pb-10 pt-[calc(env(safe-area-inset-top)+24px)]">
      <EnergyCore completed={completedCount} total={tasks.length} />

      <div className="w-full max-w-md">
        <CaptureBar onCreated={handleCreated} />
      </div>

      <div className="w-full max-w-md flex-1">
        <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-[0.3em] text-white/40">
          Hoy
        </h2>
        <TaskList tasks={pendingTasks} onCompleted={handleCompleted} />
      </div>

      {showMorningLock && <MorningLockModal onCreated={handleCreated} />}

      {showDayClose && (
        <DayCloseModal pendingTasks={pendingTasks} onResolved={handleDayCloseResolved} />
      )}

      {weeklyReward && !weeklyReward.revealed && weeklyReward.unlocked && (
        <EnvelopeReward reward={weeklyReward} />
      )}
    </main>
  );
}
