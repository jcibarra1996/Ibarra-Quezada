import { describe, expect, it } from "vitest";
import { avanceValidacion, conteoPorEstado, hallazgosPorRiesgo, hallazgosPorTema, tiempoPromedioRevision } from "@/lib/reportes/calcular";

const contratos = [
  { id: "a", estado: "aprobado" as const, recibido_en: "2026-09-10T15:00:00Z", aprobado_en: "2026-09-15T15:00:00Z" },
  { id: "b", estado: "firmado" as const, recibido_en: "2025-11-25T15:00:00Z", aprobado_en: "2025-12-03T15:00:00Z" },
  { id: "c", estado: "en_revision" as const, recibido_en: "2026-10-19T15:00:00Z", aprobado_en: null },
];

describe("reportes", () => {
  it("promedia el tiempo de revisión solo con contratos aprobados", () => {
    expect(tiempoPromedioRevision(contratos)).toEqual({ dias: 6.5, muestra: 2 });
  });

  it("no inventa un promedio si no hay contratos aprobados", () => {
    expect(tiempoPromedioRevision([contratos[2]])).toBeNull();
  });

  it("cuenta contratos por estado", () => {
    expect(conteoPorEstado(contratos)).toEqual({ recibido: 0, en_revision: 1, en_negociacion: 0, aprobado: 1, firmado: 1 });
  });

  it("agrupa hallazgos por riesgo y por tema", () => {
    const h = [
      { tema: "Jurisdicción", riesgo: "alto" as const, estado: "aceptado" },
      { tema: "Jurisdicción", riesgo: "medio" as const, estado: "pendiente" },
      { tema: "Cesión", riesgo: "alto" as const, estado: "pendiente" },
      { tema: "Precio", riesgo: "bajo" as const, estado: "descartado" },
    ];
    expect(hallazgosPorRiesgo(h)).toEqual({ alto: 2, medio: 1, bajo: 1 });
    expect(hallazgosPorTema(h)[0]).toEqual({ tema: "Jurisdicción", total: 2, altos: 1 });
    expect(hallazgosPorTema(h, 2)).toEqual([
      { tema: "Jurisdicción", total: 2, altos: 1 },
      { tema: "Otros temas", total: 2, altos: 1 },
    ]);
    expect(avanceValidacion(h)).toEqual({ validados: 2, total: 4 });
  });
});
