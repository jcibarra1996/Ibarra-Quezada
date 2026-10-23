import { describe, expect, it } from "vitest";
import { playbooksParaAnalisis, textoContrato } from "@/lib/ai/prompt";

const pbs = [
  { tipo_contrato: "suministro", playbook_positions: [{}, {}] },
  { tipo_contrato: "prestacion_servicios", playbook_positions: [{}] },
  { tipo_contrato: "confidencialidad", playbook_positions: [] },
];

describe("ahorro de tokens en el análisis", () => {
  it("con el tipo confirmado por la IA o por Legal, solo va su playbook", () => {
    expect(playbooksParaAnalisis(pbs, "suministro", "ia").map((p) => p.tipo_contrato)).toEqual(["suministro"]);
    expect(playbooksParaAnalisis(pbs, "prestacion_servicios", "manual").map((p) => p.tipo_contrato)).toEqual(["prestacion_servicios"]);
  });
  it("con el tipo provisional, desconocido o sin posiciones, van todos", () => {
    expect(playbooksParaAnalisis(pbs, "suministro", "titulo")).toHaveLength(3);
    expect(playbooksParaAnalisis(pbs, null, undefined)).toHaveLength(3);
    expect(playbooksParaAnalisis(pbs, "confidencialidad", "ia")).toHaveLength(3);
    expect(playbooksParaAnalisis(pbs, "obra", "ia")).toHaveLength(3);
  });
  it("quita espacios repetidos y renglones vacíos de más del texto que se envía", () => {
    expect(textoContrato([{ etiqueta: "PRIMERA", texto: "  OBJETO.   El   PROVEEDOR\t\tse obliga \n\n\n\n a  suministrar " }])).toBe("[PRIMERA]\nOBJETO. El PROVEEDOR se obliga\n\na suministrar");
  });
});
