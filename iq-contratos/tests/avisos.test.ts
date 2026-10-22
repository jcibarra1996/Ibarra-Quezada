import { describe, expect, it } from "vitest";
import { alertasDeFechas } from "@/lib/fechas/alertas";
import { avisosDeHoy, diasEntre, fechasDeAviso, proximoAviso, semanasDelMes, urgencia } from "@/lib/fechas/avisos";

describe("avisos programados", () => {
  it("calcula las fechas de aviso antes del plazo", () => {
    expect(fechasDeAviso("2026-11-02", [30, 15, 7, 1])).toEqual([
      { dias: 30, fecha: "2026-10-03" },
      { dias: 15, fecha: "2026-10-18" },
      { dias: 7, fecha: "2026-10-26" },
      { dias: 1, fecha: "2026-11-01" },
    ]);
  });

  it("encuentra el siguiente aviso pendiente", () => {
    expect(proximoAviso("2026-11-02", [30, 15, 7, 1], "2026-10-22")).toEqual({ dias: 7, fecha: "2026-10-26" });
    expect(proximoAviso("2026-11-02", [30], "2026-10-22")).toBeNull();
  });

  it("selecciona solo las alertas activas con aviso hoy", () => {
    const alertas = [
      { id: 1, fecha_limite: "2026-11-02", avisos_dias: [7], estado: "activa" },
      { id: 2, fecha_limite: "2026-11-02", avisos_dias: [7], estado: "atendida" },
      { id: 3, fecha_limite: "2026-12-01", avisos_dias: [7], estado: "activa" },
    ];
    expect(avisosDeHoy(alertas, "2026-10-26").map((a) => a.alerta.id)).toEqual([1]);
  });

  it("clasifica la urgencia y cuenta días", () => {
    expect(diasEntre("2026-10-22", "2026-11-02")).toBe(11);
    expect(urgencia("2026-11-02", "2026-10-22")).toBe("critica");
    expect(urgencia("2026-10-01", "2026-10-22")).toBe("vencida");
    expect(urgencia("2027-01-31", "2026-10-22")).toBe("lejana");
  });

  it("solo genera alertas para fechas futuras que exigen acción", () => {
    const a = alertasDeFechas(
      [
        { id: "a", tipo: "plazo_aviso", descripcion: "", fecha: "2026-11-02", derivada: true },
        { id: "b", tipo: "fin_vigencia", descripcion: "", fecha: "2025-01-31", derivada: false },
        { id: "c", tipo: "pago", descripcion: "", fecha: "2026-12-01", derivada: false },
        { id: "d", tipo: "vencimiento", descripcion: "", fecha: null, derivada: false },
      ],
      "2026-10-22",
    );
    expect(a.map((x) => x.key_date_id)).toEqual(["a"]);
  });

  it("arma el calendario de lunes a domingo", () => {
    const s = semanasDelMes("2026-11");
    expect(s[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(s.flat().filter(Boolean)).toHaveLength(30);
  });
});
