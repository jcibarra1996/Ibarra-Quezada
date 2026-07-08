export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, hora local
}

export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA");
}

/** Lunes de la semana de `date` (ISO date string), como YYYY-MM-DD */
export function weekStartISO(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day; // retrocede hasta el lunes
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("en-CA");
}

/** ¿Ya pasaron las 21:00 hora local? — dispara el Cierre Forzoso */
export function isPastCloseTime(hour = 21): boolean {
  return new Date().getHours() >= hour;
}

/**
 * ¿Ya pasaron las 8:45 AM? — si no hay registro todavía, bloquea la UI
 * con el "Plan de Ataque" hasta que se agregue una tarea. Deja de
 * aplicar después de las 21:00 (ahí manda el Cierre Forzoso).
 */
export function isPastMorningLockTime(hour = 8, minute = 45): boolean {
  const now = new Date();
  const afterLock = now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
  return afterLock && now.getHours() < 21;
}

export function isFridayAfter5pm(): boolean {
  const now = new Date();
  return now.getDay() === 5 && now.getHours() >= 17;
}
