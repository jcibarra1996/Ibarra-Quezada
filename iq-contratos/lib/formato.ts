const zona = "America/Mexico_City";

export function fecha(valor: string | Date | null | undefined): string {
  if (!valor) return "";
  const d = typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00`) : new Date(valor);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: zona });
}

export function fechaHora(valor: string | Date | null | undefined): string {
  if (!valor) return "";
  return new Date(valor).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zona,
  });
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter((p) => p && p[0] === p[0].toUpperCase())
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

// "hace 5 minutos", "hace 3 horas", "ayer", o la fecha si es más antigua.
export function haceCuanto(valor: string | Date): string {
  const ms = Date.now() - new Date(valor).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} ${min === 1 ? "minuto" : "minutos"}`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  return fecha(valor);
}

export function fechaLargaHoy(): string {
  const t = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: zona });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// "21 oct", para líneas de tiempo compactas.
export function fechaCorta(valor: string | Date): string {
  return new Date(valor).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: zona }).replace(".", "");
}
