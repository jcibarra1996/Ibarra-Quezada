import { describe, expect, it } from "vitest";
import { duracion, lineaTiempo } from "@/lib/linea-tiempo";

const ahora = new Date("2026-10-20T12:00:00Z");

describe("línea de tiempo de una solicitud", () => {
  it("fecha cada etapa, marca la actual y cuenta los días", () => {
    const l = lineaTiempo({
      estado: "en_revision",
      recibido_en: "2026-10-10T12:00:00Z",
      cambios: [{ a: "en_revision", creado_en: "2026-10-12T12:00:00Z" }],
      ahora,
    });
    expect(l.pasos.map((p) => p.situacion)).toEqual(["hecho", "actual", "pendiente", "pendiente", "pendiente"]);
    expect(l.pasos[1].desde).toBe("2026-10-12T12:00:00Z");
    expect(l.enEtapaDesde).toBe("2026-10-12T12:00:00Z");
    expect(l.diasTotales).toBe(10);
  });

  it("la negociación sin registro queda como omitida y el total se cuenta hasta la firma", () => {
    const l = lineaTiempo({
      estado: "firmado",
      recibido_en: "2026-10-01T12:00:00Z",
      cambios: [
        { a: "aprobado", creado_en: "2026-10-05T12:00:00Z" },
        { a: "en_revision", creado_en: "2026-10-02T12:00:00Z" },
        { a: "firmado", creado_en: "2026-10-08T12:00:00Z" },
      ],
      ahora,
    });
    expect(l.pasos.map((p) => p.situacion)).toEqual(["hecho", "hecho", "omitido", "hecho", "actual"]);
    expect(l.diasTotales).toBe(7);
  });

  it("si el contrato regresa de etapa, las posteriores vuelven a pendientes", () => {
    const l = lineaTiempo({
      estado: "en_revision",
      recibido_en: "2026-10-01T12:00:00Z",
      cambios: [
        { a: "en_revision", creado_en: "2026-10-02T12:00:00Z" },
        { a: "en_negociacion", creado_en: "2026-10-04T12:00:00Z" },
        { a: "en_revision", creado_en: "2026-10-06T12:00:00Z" },
      ],
      ahora,
    });
    expect(l.pasos[2].situacion).toBe("pendiente");
    expect(l.enEtapaDesde).toBe("2026-10-06T12:00:00Z");
  });

  it("describe la duración en días", () => {
    expect(duracion(0)).toBe("menos de un día");
    expect(duracion(1)).toBe("1 día");
    expect(duracion(12)).toBe("12 días");
  });
});

describe("fechas oficiales del contrato", () => {
  it("prevalecen sobre la bitácora y descartan fechas fuera de orden", () => {
    const l = lineaTiempo({
      estado: "firmado",
      recibido_en: "2025-11-25T12:00:00Z",
      aprobado_en: "2025-12-03T12:00:00Z",
      firmado_en: "2025-12-12T12:00:00Z",
      // Bitácora generada al cargar el contrato con su historia ya avanzada.
      cambios: [
        { a: "en_revision", creado_en: "2026-10-23T12:00:00Z" },
        { a: "aprobado", creado_en: "2026-10-23T12:00:01Z" },
        { a: "firmado", creado_en: "2026-10-23T12:00:02Z" },
      ],
      ahora,
    });
    expect(l.pasos.map((p) => [p.situacion, p.desde])).toEqual([
      ["hecho", "2025-11-25T12:00:00Z"],
      ["omitido", null],
      ["omitido", null],
      ["hecho", "2025-12-03T12:00:00Z"],
      ["actual", "2025-12-12T12:00:00Z"],
    ]);
    expect(l.diasTotales).toBe(17);
  });
});
