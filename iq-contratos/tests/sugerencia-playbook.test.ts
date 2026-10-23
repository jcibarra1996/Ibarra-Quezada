import { describe, expect, it } from "vitest";
import { limpiarSugerencias, type SugerenciaPosicion } from "@/lib/ai/sugerencia-playbook";

const base = (tema: string, extra: Partial<SugerenciaPosicion> = {}): SugerenciaPosicion => ({
  tema,
  preferida: "Treinta días naturales",
  respaldo: "Cuarenta y cinco días",
  nunca_se_acepta: "Pago condicionado a la contraparte",
  clausula_modelo: "DÉCIMA.- PAGO. LA EMPRESA pagará en [plazo].",
  referencias_normativas: [],
  por_verificar: "",
  ...extra,
});

describe("sugerencias de playbook", () => {
  it("descarta temas que el playbook ya tiene, sin importar acentos ni mayúsculas", () => {
    const r = limpiarSugerencias([base("Jurisdicción"), base("Penas convencionales")], [{ tema: "jurisdiccion" }]);
    expect(r.map((s) => s.tema)).toEqual(["Penas convencionales"]);
  });

  it("quita rayas largas y conserva los rangos con guion corto", () => {
    const [s] = limpiarSugerencias([base("Pago", { preferida: "Pago a 30 días — sin anticipo; aviso de 10–15 días" })], []);
    expect(s.preferida).toBe("Pago a 30 días, sin anticipo; aviso de 10–15 días");
  });

  it("con tema pedido, regresa una sola posición con ese tema aunque ya exista", () => {
    const r = limpiarSugerencias([base("Otro nombre"), base("Más")], [{ tema: "Intereses moratorios" }], "Intereses moratorios");
    expect(r).toHaveLength(1);
    expect(r[0].tema).toBe("Intereses moratorios");
  });

  it("descarta temas vacíos y repetidos dentro de la misma respuesta", () => {
    const r = limpiarSugerencias([base("  "), base("Confidencialidad"), base("CONFIDENCIALIDAD")], []);
    expect(r.map((s) => s.tema)).toEqual(["Confidencialidad"]);
  });
});
