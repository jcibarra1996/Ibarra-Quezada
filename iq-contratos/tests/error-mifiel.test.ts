import { describe, expect, it } from "vitest";
import { detalleErrorMifiel } from "@/lib/firmas/error-mifiel";

describe("errores de Mifiel", () => {
  it("lee el formato documentado (title y details)", () => {
    expect(detalleErrorMifiel({ status: "error", errors: [{ title: "Bad request", details: "File must be a PDF" }] })).toBe("File must be a PDF");
  });

  it("lee listas de textos, error y message", () => {
    expect(detalleErrorMifiel({ status: "error", errors: ["Insufficient credits", "Insufficient credits"] })).toBe("Insufficient credits");
    expect(detalleErrorMifiel({ error: "Document already exists" })).toBe("Document already exists");
    expect(detalleErrorMifiel({ message: "Invalid signatory" })).toBe("Invalid signatory");
  });

  it("lee errores por campo", () => {
    expect(detalleErrorMifiel({ errors: { "signatories.0.email": ["is invalid"], file: ["can't be blank"] } })).toBe("signatories.0.email: is invalid file: can't be blank");
  });

  it("regresa null si no hay razón", () => {
    expect(detalleErrorMifiel(null)).toBeNull();
    expect(detalleErrorMifiel({ status: "error" })).toBeNull();
  });
});
