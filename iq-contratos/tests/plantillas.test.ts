import { describe, expect, it } from "vitest";
import { cantidadConLetra, fechaLarga, importeConLetra, leerImporte, numeroALetras } from "@/lib/plantillas/numeros";
import { llenarPlantilla, marcadoresNegocio, type ParteLlenado } from "@/lib/plantillas/llenar";
import { PLANTILLAS_BASE } from "@/lib/plantillas/base";
import { estructurar } from "@/lib/parsing/clausulas";
import { textoADocx } from "@/lib/docx/desde-texto";
import { extraerTextoDocx } from "@/lib/parsing/extraer-docx";
import { EXPEDIENTES_DEMO } from "@/supabase/seed/expedientes";

describe("cantidades con letra", () => {
  it("escribe importes como en un contrato mexicano", () => {
    expect(importeConLetra(180000)).toBe("$180,000.00 (ciento ochenta mil pesos 00/100 M.N.)");
    expect(importeConLetra(1)).toBe("$1.00 (un peso 00/100 M.N.)");
    expect(importeConLetra(21000.5)).toBe("$21,000.50 (veintiún mil pesos 50/100 M.N.)");
    expect(importeConLetra(1000000)).toBe("$1,000,000.00 (un millón de pesos 00/100 M.N.)");
    expect(importeConLetra(2_351_101)).toBe("$2,351,101.00 (dos millones trescientos cincuenta y un mil ciento un pesos 00/100 M.N.)");
  });
  it("cubre los casos especiales del español", () => {
    expect(numeroALetras(100)).toBe("cien");
    expect(numeroALetras(101)).toBe("ciento uno");
    expect(numeroALetras(16)).toBe("dieciséis");
    expect(numeroALetras(22)).toBe("veintidós");
    expect(numeroALetras(31)).toBe("treinta y uno");
    expect(numeroALetras(500)).toBe("quinientos");
    expect(numeroALetras(1_000_000_000)).toBe("mil millones");
    expect(cantidadConLetra(12, "mes", "meses")).toBe("12 (doce) meses");
    expect(cantidadConLetra(1, "año", "años")).toBe("1 (un) año");
    expect(cantidadConLetra(21, "día natural", "días naturales")).toBe("21 (veintiún) días naturales");
  });
  it("lee importes capturados de distintas formas y fechas largas", () => {
    expect(leerImporte("$180,000.50")).toBe(180000.5);
    expect(leerImporte("180 mil")).toBeNull();
    expect(fechaLarga("2027-02-01")).toBe("1 de febrero de 2027");
  });
});

const aParte = (denominacion: string): ParteLlenado => {
  const e = EXPEDIENTES_DEMO.find((x) => x.denominacion === denominacion)!;
  return { denominacion: e.denominacion, rfc: e.rfc, tipo_persona: "moral", datos: e.datos };
};
const propia = aParte("EMPRESA CLIENTE, S.A. DE C.V.");
const tercero = aParte("LOGÍSTICA DEMO, S.A. DE C.V.");

const NEGOCIO: Record<string, string> = {
  descripcion_servicios: "almacenaje y distribución de mercancía en la zona metropolitana",
  contraprestacion: "85000",
  productos: "empaques de cartón corrugado",
  bienes: "diez montacargas eléctricos",
  precio: "1250000",
  lugar_entrega: "el almacén de la empresa en la Ciudad de México",
  fecha_entrega: "2027-03-15",
  inmueble: "Avenida Ficticia número 300, piso 8, Colonia Demo, Alcaldía Miguel Hidalgo, Código Postal 11000, Ciudad de México",
  titulo_propiedad: "la escritura pública número 7,777, otorgada ante la fe de la Notaría Pública número 903 de la Ciudad de México",
  renta: "180000",
  proposito: "evaluar la posible contratación de servicios de logística",
  fecha_inicio: "2027-01-01",
};

function llenar(i: number, partes = true) {
  const t = PLANTILLAS_BASE[i];
  return llenarPlantilla({
    cuerpo: t.cuerpo,
    roles: t.roles,
    campos: t.campos,
    partes: Object.fromEntries(t.roles.map((r) => [r.clave, partes ? (r.propia ? propia : tercero) : null])),
    negocio: NEGOCIO,
    lugarFirma: "la Ciudad de México",
    fechaFirma: "2026-12-15",
  });
}

describe("plantillas base", () => {
  it.each(PLANTILLAS_BASE.map((t, i) => [t.nombre, i] as const))("%s: con expedientes completos no deja pendientes ni marcadores", (_n, i) => {
    const r = llenar(i);
    expect(r.faltantes).toEqual([]);
    expect(r.texto).not.toMatch(/\{\{|\}\}|PENDIENTE/);
    expect(r.texto).not.toMatch(/[—―]/);
    expect(r.texto).not.toMatch(/\b(Agreement|Whereas|Recitals)\b/i);
  });

  it.each(PLANTILLAS_BASE.map((t, i) => [t.nombre, i] as const))("%s: el parser reconoce proemio, declaraciones, cláusulas en orden y cierre", (_n, i) => {
    const doc = estructurar([llenar(i).texto]);
    const tipos = doc.secciones.map((s) => s.tipo);
    expect(tipos[0]).toBe("proemio");
    expect(doc.secciones.filter((s) => s.tipo === "declaracion").map((s) => s.etiqueta)).toEqual(["DECLARACIÓN I", "DECLARACIÓN II", "DECLARACIÓN III"]);
    const clausulas = doc.secciones.filter((s) => s.tipo === "clausula");
    expect(clausulas.length).toBeGreaterThanOrEqual(12);
    expect(clausulas[0].etiqueta).toBe("PRIMERA");
    expect(tipos.at(-1)).toBe("cierre");
  });

  it("solo usa datos del negocio que la plantilla pide", () => {
    for (const t of PLANTILLAS_BASE) {
      const claves = new Set(t.campos.map((c) => c.clave));
      expect(marcadoresNegocio(t.cuerpo, t.roles).filter((m) => !claves.has(m))).toEqual([]);
      expect(t.roles.filter((r) => r.propia)).toHaveLength(1);
    }
  });

  it("declara los datos corporativos del expediente en formato mexicano", () => {
    const r = llenar(0);
    expect(r.texto).toContain("LOGÍSTICA DEMO, S.A. DE C.V., REPRESENTADA EN ESTE ACTO POR MÓNICA FICTICIA RANGEL");
    expect(r.texto).toContain("escritura pública número 30,114, de fecha 15 de marzo de 2017, otorgada ante la fe de Beatriz Ejemplo Torres, titular de la Notaría Pública número 903 de la Ciudad de México");
    expect(r.texto).toContain("con la clave LDE170315HT2");
    expect(r.texto).toContain("$85,000.00 (ochenta y cinco mil pesos 00/100 M.N.)");
    expect(r.texto).toContain("30 (treinta) días naturales");
  });

  it("marca como pendiente lo que el expediente no tiene, sin inventarlo", () => {
    const incompleto: ParteLlenado = { denominacion: "PRESTADORA DE SERVICIOS DEMO, S.A. DE C.V.", rfc: null, tipo_persona: "moral", datos: { constitucion_escritura: "8,910" } };
    const t = PLANTILLAS_BASE[0];
    const r = llenarPlantilla({ cuerpo: t.cuerpo, roles: t.roles, campos: t.campos, partes: { prestador: incompleto, cliente: propia }, negocio: NEGOCIO, lugarFirma: "la Ciudad de México", fechaFirma: null });
    expect(r.texto).toContain("escritura pública número 8,910");
    expect(r.faltantes).toEqual(expect.arrayContaining(["RFC de EL PRESTADOR", "representante legal de EL PRESTADOR", "fecha de firma"]));
    expect(r.texto).toContain("[PENDIENTE: RFC de EL PRESTADOR]");
  });

  it("sin expedientes, todas las partes quedan pendientes", () => {
    const r = llenar(1, false);
    expect(r.faltantes).toEqual(expect.arrayContaining(["expediente de EL VENDEDOR", "expediente de EL COMPRADOR"]));
  });

  it("persona física comparece por su propio derecho", () => {
    const fisica: ParteLlenado = { denominacion: "Juana Ejemplo Pérez", rfc: "EEPJ800101AB1", tipo_persona: "fisica", datos: { identificacion: "credencial para votar con folio 0000000000000", domicilio: "Calle Demo 1, Ciudad de México" } };
    const t = PLANTILLAS_BASE[0];
    const r = llenarPlantilla({ cuerpo: t.cuerpo, roles: t.roles, campos: t.campos, partes: { prestador: fisica, cliente: propia }, negocio: NEGOCIO, lugarFirma: "la Ciudad de México", fechaFirma: "2026-12-15" });
    expect(r.texto).toContain("JUANA EJEMPLO PÉREZ, POR SU PROPIO DERECHO");
    expect(r.texto).toContain("I. Declara EL PRESTADOR, por su propio derecho, que:");
    expect(r.texto).toContain("se identifica con credencial para votar con folio 0000000000000");
    expect(r.faltantes).toEqual([]);
  });

  it("el Word generado conserva el texto y la estructura", async () => {
    const r = llenar(4);
    const texto = await extraerTextoDocx(await textoADocx(r.texto));
    const original = estructurar([r.texto]).secciones.map((s) => s.etiqueta);
    expect(estructurar([texto]).secciones.map((s) => s.etiqueta)).toEqual(original);
  });
});
