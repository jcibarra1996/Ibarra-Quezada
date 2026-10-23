import { describe, expect, it } from "vitest";
import { tipoPorTitulo } from "@/lib/contratos/tipo-por-titulo";

describe("tipo de contrato por su título", () => {
  it("lo toma del título cuando lo dice expresamente", () => {
    expect(tipoPorTitulo("Contrato de prestación de servicios de logística")).toBe("prestacion_servicios");
    expect(tipoPorTitulo("Contrato de prestación de servicios aduanales y mandato")).toBe("prestacion_servicios");
    expect(tipoPorTitulo("CONTRATO DE ARRENDAMIENTO QUE CELEBRAN, POR UNA PARTE, ...")).toBe("arrendamiento");
    expect(tipoPorTitulo("Contrato de suministro")).toBe("suministro");
    expect(tipoPorTitulo("Convenio de confidencialidad")).toBe("confidencialidad");
    expect(tipoPorTitulo("Contrato de compraventa de equipo")).toBe("compraventa");
    expect(tipoPorTitulo("Contrato de obra a precio alzado")).toBe("obra");
  });
  it("no adivina con lo que viene después de la denominación ni con títulos genéricos", () => {
    expect(tipoPorTitulo("Contrato de licencia de uso de software")).toBeNull();
    expect(tipoPorTitulo("Contrato de licencia que celebran ... para el suministro de soporte")).toBeNull();
    expect(tipoPorTitulo("Contrato")).toBeNull();
  });
});
