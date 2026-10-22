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
