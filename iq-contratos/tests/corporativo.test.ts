import { describe, expect, it } from "vitest";
import { claveDenominacion, integrarDatos, rfcValido } from "@/lib/corporativo/campos";
import { procesarExtraccion, ErrorExtraccion } from "@/lib/corporativo/esquema";
import { identificarPartes } from "@/lib/corporativo/vincular";
import { expedienteParaPrompt } from "@/lib/corporativo/para-prompt";

describe("RFC", () => {
  it("acepta personas morales y físicas con fecha válida", () => {
    expect(rfcValido("PXY180921KD7", "moral")).toBe(true);
    expect(rfcValido("GODE561231GR8", "fisica")).toBe(true);
    expect(rfcValido("pxy180921kd7")).toBe(true);
  });
  it("rechaza formato, fecha o tipo de persona incorrectos", () => {
    expect(rfcValido("PXY181321KD7")).toBe(false); // mes 13
    expect(rfcValido("PXY18092KD7")).toBe(false);
    expect(rfcValido("GODE561231GR8", "moral")).toBe(false);
  });
});

describe("denominaciones", () => {
  it("compara sin acentos, puntuación ni tipo societario", () => {
    expect(claveDenominacion("PROVEEDOR XYZ, S.A. DE C.V.")).toBe("PROVEEDOR XYZ");
    expect(claveDenominacion("Proveedor XYZ SA de CV")).toBe("PROVEEDOR XYZ");
    expect(claveDenominacion("DESARROLLOS TECNOLÓGICOS DEMO, S.A.P.I. DE C.V.")).toBe("DESARROLLOS TECNOLOGICOS DEMO");
    expect(claveDenominacion("Servicios Rosa, S. de R.L. de C.V.")).toBe("SERVICIOS ROSA");
  });

  it("vincula las partes del proemio solo con coincidencias exactas", () => {
    const expedientes = [
      { id: "p", denominacion: "EMPRESA CLIENTE, S.A. DE C.V.", es_propia: true },
      { id: "x", denominacion: "PROVEEDOR XYZ, S.A. DE C.V.", es_propia: false },
      { id: "y", denominacion: "PROVEEDOR XY, S.A. DE C.V.", es_propia: false },
    ];
    const proemio = 'CONTRATO DE SUMINISTRO QUE CELEBRAN, POR UNA PARTE, PROVEEDOR XYZ, S.A. DE C.V., A QUIEN... Y POR LA OTRA, EMPRESA CLIENTE, S.A. DE C.V.';
    expect(identificarPartes({ proemio, contraparte: "PROVEEDOR XYZ, S.A. DE C.V.", expedientes })).toEqual({ propiaId: "p", contraparteId: "x" });
    expect(identificarPartes({ proemio: "CONTRATO CON OTRA EMPRESA, S.A.", contraparte: "OTRA EMPRESA, S.A.", expedientes })).toEqual({ propiaId: "p", contraparteId: null });
  });
});

describe("integración de datos extraídos", () => {
  const doc = (tipo: "acta_constitutiva" | "constancia_fiscal" | "poder") => ({ id: "d1", tipo });

  it("llena datos vacíos y registra la fuente", () => {
    const r = integrarDatos({ datos: {}, fuentes: {}, documento: doc("acta_constitutiva"), extraidos: [{ clave: "constitucion_escritura", valor: "12,345", cita: "NÚMERO 12,345", pagina: 1 }] });
    expect(r.datos.constitucion_escritura).toBe("12,345");
    expect(r.fuentes.constitucion_escritura).toMatchObject({ documento_id: "d1", tipo: "acta_constitutiva", pagina: 1 });
    expect(r.cambios).toEqual(["constitucion_escritura"]);
  });

  it("un documento que es fuente primaria reemplaza el dato; otro solo reporta la diferencia", () => {
    const base = { datos: { poder_escritura: "111", constitucion_escritura: "222" }, fuentes: {} };
    const poder = integrarDatos({ ...base, documento: doc("poder"), extraidos: [{ clave: "poder_escritura", valor: "999", cita: null, pagina: null }] });
    expect(poder.datos.poder_escritura).toBe("999");
    expect(poder.diferencias[0]).toMatchObject({ reemplazado: true });
    const csf = integrarDatos({ ...base, documento: doc("constancia_fiscal"), extraidos: [{ clave: "constitucion_escritura", valor: "333", cita: null, pagina: null }] });
    expect(csf.datos.constitucion_escritura).toBe("222");
    expect(csf.diferencias[0]).toMatchObject({ anterior: "222", nuevo: "333", reemplazado: false });
  });

  it("el domicilio solo se toma de la constancia fiscal o de un comprobante, nunca del acta", () => {
    const r = integrarDatos({ datos: {}, fuentes: {}, documento: doc("acta_constitutiva"), extraidos: [{ clave: "domicilio", valor: "Ciudad de México", cita: null, pagina: 1 }] });
    expect(r.datos.domicilio).toBeUndefined();
    const c = integrarDatos({ datos: {}, fuentes: {}, documento: doc("constancia_fiscal"), extraidos: [{ clave: "domicilio", valor: "Calle Uno 1, CDMX", cita: null, pagina: 1 }] });
    expect(c.datos.domicilio).toBe("Calle Uno 1, CDMX");
  });

  it("no cuenta como cambio una diferencia de forma", () => {
    const r = integrarDatos({ datos: { domicilio: "Calle Uno 1, CDMX" }, fuentes: {}, documento: doc("constancia_fiscal"), extraidos: [{ clave: "domicilio", valor: "calle uno 1 cdmx", cita: null, pagina: null }] });
    expect(r.cambios).toEqual([]);
    expect(r.diferencias).toEqual([]);
  });
});

describe("validación de la extracción (zod)", () => {
  const valida = {
    tipo_documento: "acta_constitutiva",
    denominacion: "PROVEEDOR XYZ, S.A. DE C.V.",
    tipo_persona: "moral",
    rfc: "pxy-180921-kd7",
    campos: [
      { clave: "constitucion_fecha", valor: "2018-09-21", cita: "21 de septiembre de 2018", pagina: 1 },
      { clave: "poder_fecha", valor: "2023-02-30", cita: "30 de febrero", pagina: 2 },
      { clave: "constitucion_fecha", valor: "2019-01-01", cita: "repetido", pagina: 3 },
      { clave: "objeto_social", valor: "Fabricación — y venta", cita: "objeto", pagina: 1 },
    ],
    observaciones: [],
    resumen: "Acta — extracto",
  };

  it("normaliza el RFC, descarta fechas inválidas y campos repetidos, y quita rayas largas", () => {
    const r = procesarExtraccion(valida);
    expect(r.rfc).toBe("PXY180921KD7");
    expect(r.campos.map((c) => c.clave)).toEqual(["constitucion_fecha", "objeto_social"]);
    expect(r.campos[0].valor).toBe("2018-09-21");
    expect(r.campos[1].valor).toBe("Fabricación, y venta");
    expect(r.observaciones.some((o) => o.includes("fecha"))).toBe(true);
    expect(r.resumen).not.toMatch(/—/);
  });

  it("no registra un RFC con formato inválido", () => {
    const r = procesarExtraccion({ ...valida, rfc: "ABC123" });
    expect(r.rfc).toBeNull();
    expect(r.observaciones.some((o) => o.includes("RFC"))).toBe(true);
  });

  it("rechaza claves de campo desconocidas y salidas que no son objetos", () => {
    expect(() => procesarExtraccion({ ...valida, campos: [{ clave: "capital_social", valor: "1", cita: "", pagina: null }] })).toThrow(ErrorExtraccion);
    expect(() => procesarExtraccion("texto")).toThrow(ErrorExtraccion);
  });
});

describe("expediente para el modelo", () => {
  it("lista datos con su fuente y los que faltan, sin inventar", () => {
    const e = expedienteParaPrompt(
      {
        id: "x",
        denominacion: "PROVEEDOR XYZ, S.A. DE C.V.",
        rfc: null,
        tipo_persona: "moral",
        estado: "por_validar",
        datos: { constitucion_escritura: "12,345" },
        fuentes: { constitucion_escritura: { documento_id: "d", tipo: "acta_constitutiva", cita: null, pagina: 2 } },
      },
      "contraparte",
    );
    expect(e.validado).toBe(false);
    expect(e.datos).toEqual([{ etiqueta: "Escritura constitutiva (número)", valor: "12,345", fuente: "Acta constitutiva, página 2" }]);
    expect(e.faltantes).toContain("Representante legal");
    expect(e.faltantes).not.toContain("Escritura constitutiva (número)");
  });
});
