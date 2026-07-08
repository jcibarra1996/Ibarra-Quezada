export type Context = "trabajo" | "casa";

export type TaskStatus = "pending" | "completed" | "archived";

export type TaskSource = "manual" | "quick_add" | "recurring" | "magic_link";

export interface Task {
  id: string;
  title: string;
  context: Context;
  smart_tags: string[];
  status: TaskStatus;
  scheduled_for: string; // date, YYYY-MM-DD
  source: TaskSource;
  recurring_task_id: string | null;
  share_token: string;
  completed_at: string | null;
  completed_via: "app" | "magic_link" | null;
  archived_at: string | null;
  archive_reason: "no_energy" | "day_close_delete" | "manual" | null;
  created_at: string;
  updated_at: string;
}

export type Recurrence = "monthly" | "weekly" | "interval";

export interface RecurringTask {
  id: string;
  title: string;
  context: Context;
  smart_tags: string[];
  recurrence: Recurrence;
  day_of_month: number | null;
  day_of_week: number | null;
  interval_days: number | null;
  last_injected_date: string | null;
  active: boolean;
  created_at: string;
}

export interface DayClose {
  id: string;
  close_date: string;
  closed_at: string | null;
  total_tasks: number;
  completed_tasks: number;
  effectiveness: number;
  used_escape_button: boolean;
  created_at: string;
}

export interface WeeklyReward {
  id: string;
  week_start: string;
  unlocked: boolean;
  unlocked_at: string | null;
  revealed: boolean;
  revealed_at: string | null;
  skin_id: string | null;
  created_at: string;
}

export type DayCloseDecision =
  | { taskId: string; action: "reprogramar_manana" }
  | { taskId: string; action: "programar_fecha"; date: string }
  | { taskId: string; action: "eliminar" };
