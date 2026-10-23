import { describe, expect, it } from "vitest";
import { abreNegociacion } from "@/lib/tipos";

describe("descarga de la contrapropuesta", () => {
  it("pasa a En negociación un contrato recibido o en revisión", () => {
    expect(abreNegociacion("recibido")).toBe(true);
    expect(abreNegociacion("en_revision")).toBe(true);
  });

  it("no regresa un contrato que ya avanzó", () => {
    expect(abreNegociacion("en_negociacion")).toBe(false);
    expect(abreNegociacion("aprobado")).toBe(false);
    expect(abreNegociacion("firmado")).toBe(false);
  });
});
