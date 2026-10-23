import { describe, expect, it } from "vitest";
import { calcularVigencia, valorAnual, type DatosVigencia } from "@/lib/vigencia";

const firmado = (c: Partial<DatosVigencia>): DatosVigencia => ({
  estado: "firmado",
  firmado_en: "2026-01-10T18:00:00Z",
  inicio_vigencia: null,
  fin_vigencia: null,
  duracion_meses: null,
  renovacion_automatica: null,
  renovacion_meses: null,
  aviso_dias: null,
  aviso_habiles: false,
  terminado_en: null,
  ...c,
});

describe("vigencia del contrato", () => {
  it("antes de la firma el contrato sigue en proceso", () => {
    expect(calcularVigencia({ ...firmado({}), estado: "aprobado" }, "2026-10-23").situacion).toBe("en_proceso");
  });

  it("vigente, por vencer y vencido según el término", () => {
    const c = firmado({ inicio_vigencia: "2026-01-01", fin_vigencia: "2027-12-31" });
    expect(calcularVigencia(c, "2026-10-23")).toMatchObject({ situacion: "vigente", fin: "2027-12-31" });
    expect(calcularVigencia(c, "2027-10-15").situacion).toBe("por_vencer");
    expect(calcularVigencia(c, "2028-01-01")).toMatchObject({ situacion: "vencido", diasRestantes: -1 });
  });

  it("sin término es vigente por tiempo indefinido; con inicio futuro, por iniciar", () => {
    expect(calcularVigencia(firmado({}), "2026-10-23")).toMatchObject({ situacion: "vigente", inicio: "2026-01-10", fin: null });
    expect(calcularVigencia(firmado({ inicio_vigencia: "2027-01-01", fin_vigencia: "2029-12-31" }), "2026-10-23").situacion).toBe("por_iniciar");
  });

  it("calcula el término con la duración en meses", () => {
    expect(calcularVigencia(firmado({ inicio_vigencia: "2026-02-01", duracion_meses: 12 }), "2026-10-23").fin).toBe("2027-01-31");
  });

  it("con renovación automática, avanza el periodo y lo marca como renovado", () => {
    const v = calcularVigencia(firmado({ inicio_vigencia: "2024-01-01", fin_vigencia: "2024-12-31", renovacion_automatica: true, renovacion_meses: 12 }), "2026-03-01");
    expect(v).toMatchObject({ situacion: "renovado", fin: "2026-12-31", finOriginal: "2024-12-31", renovaciones: 2, periodoSupuesto: false });
  });

  it("si el contrato no dice el periodo de renovación, usa la duración original y lo señala", () => {
    const v = calcularVigencia(firmado({ inicio_vigencia: "2025-01-01", fin_vigencia: "2025-06-30", renovacion_automatica: true }), "2025-09-01");
    expect(v).toMatchObject({ periodoRenovacion: 6, periodoSupuesto: true, fin: "2025-12-31" });
  });

  it("el último día de aviso adelanta el por vencer", () => {
    const c = firmado({ inicio_vigencia: "2026-01-01", fin_vigencia: "2027-06-30", renovacion_automatica: true, renovacion_meses: 12, aviso_dias: 120 });
    const v = calcularVigencia(c, "2027-02-10");
    expect(v.limiteAviso).toBe("2027-03-02");
    expect(v.situacion).toBe("por_vencer");
    expect(calcularVigencia({ ...c, aviso_habiles: true, aviso_dias: 5 }, "2026-10-23").limiteAviso).toBe("2027-06-23");
  });

  it("terminado anticipadamente", () => {
    expect(calcularVigencia(firmado({ fin_vigencia: "2028-01-01", terminado_en: "2026-09-30" }), "2026-10-23")).toMatchObject({ situacion: "terminado", fin: "2026-09-30" });
  });
});

describe("valor anual estimado", () => {
  const v = { inicio: "2027-01-01", finOriginal: "2029-12-31" };
  it("mensual por doce, anual tal cual, total repartido en el plazo", () => {
    expect(valorAnual({ monto: 180000, monto_periodo: "mensual" }, v)).toBe(2160000);
    expect(valorAnual({ monto: 500000, monto_periodo: "anual" }, v)).toBe(500000);
    expect(valorAnual({ monto: 3600000, monto_periodo: "total" }, v)).toBe(1200000);
    expect(valorAnual({ monto: 600000, monto_periodo: "total" }, { inicio: "2026-01-01", finOriginal: "2026-06-30" })).toBe(600000);
  });
  it("sin monto o sin plazo para un total no se estima", () => {
    expect(valorAnual({ monto: null, monto_periodo: "mensual" }, v)).toBeNull();
    expect(valorAnual({ monto: 1000, monto_periodo: "total" }, { inicio: null, finOriginal: null })).toBeNull();
  });
});
