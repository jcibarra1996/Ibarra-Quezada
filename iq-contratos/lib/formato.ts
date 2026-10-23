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

// "$180,000.00 MXN"
export function dinero(monto: number | string | null | undefined, moneda: string | null = "MXN"): string {
  if (monto == null || monto === "") return "";
  const n = Number(monto);
  return `${n.toLocaleString("es-MX", { style: "currency", currency: moneda ?? "MXN", currencyDisplay: "narrowSymbol", minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda ?? "MXN"}`;
}

// "$2.2 M MXN", para totales de cartera.
export function dineroCorto(monto: number, moneda = "MXN"): string {
  const abs = Math.abs(monto);
  const corto = abs >= 1e6 ? `${(monto / 1e6).toLocaleString("es-MX", { maximumFractionDigits: 1 })} M` : abs >= 1e3 ? `${(monto / 1e3).toLocaleString("es-MX", { maximumFractionDigits: 0 })} mil` : monto.toLocaleString("es-MX");
  return `$${corto} ${moneda}`;
}
