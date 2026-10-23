import { describe, expect, it } from "vitest";
import { aplicarFicha, procesarFicha, type FichaModelo } from "@/lib/ai/ficha-esquema";

const texto = `CONTRATO DE ARRENDAMIENTO QUE CELEBRAN, POR UNA PARTE, ARRENDADORA DEMO, S.A. DE C.V.
SEGUNDA.- RENTA. LA ARRENDATARIA pagará una renta mensual de $180,000.00 (ciento ochenta mil pesos 00/100 M.N.), más el Impuesto al Valor Agregado.
QUINTA.- VIGENCIA. El presente contrato tendrá una vigencia forzosa para ambas partes de tres años, contados a partir del 1 de enero de 2027 y hasta el 31 de diciembre de 2029.
SEXTA.- RENOVACIÓN. Si LA ARRENDATARIA desea renovar el arrendamiento, deberá notificarlo por escrito con al menos sesenta días naturales de anticipación al vencimiento.
DÉCIMA.- JURISDICCIÓN. Las partes se someten a los tribunales competentes de la Ciudad de México.`;

const salida = (c: Partial<FichaModelo> = {}): FichaModelo => ({
  tipo: { tipo: "arrendamiento", cita: "CONTRATO DE ARRENDAMIENTO" },
  monto: { monto: 180000, moneda: "MXN", periodo: "mensual", cita: "pagará una renta mensual de $180,000.00" },
  vigencia: { inicio: "2027-01-01", fin: "2029-12-31", duracion_meses: 36, cita: "contados a partir del 1 de enero de 2027 y hasta el 31 de diciembre de 2029" },
  renovacion: { automatica: false, meses: null, cita: "Si LA ARRENDATARIA desea renovar el arrendamiento, deberá notificarlo por escrito" },
  aviso: { dias: 60, habiles: false, cita: "con al menos sesenta días naturales de anticipación al vencimiento" },
  ley_aplicable: { texto: null, cita: null },
  jurisdiccion: { texto: "Tribunales competentes de la Ciudad de México", cita: "Las partes se someten a los tribunales competentes de la Ciudad de México." },
  ...c,
});

describe("ficha extraída por la IA", () => {
  it("toma los datos con cita textual y guarda la cita como fuente", () => {
    const { valores, fuentes } = procesarFicha(salida(), texto);
    expect(valores).toMatchObject({ tipo_contrato: "arrendamiento", monto: 180000, moneda: "MXN", monto_periodo: "mensual", inicio_vigencia: "2027-01-01", fin_vigencia: "2029-12-31", renovacion_automatica: false, aviso_dias: 60, jurisdiccion: "Tribunales competentes de la Ciudad de México" });
    expect(valores.ley_aplicable).toBeUndefined();
    expect(fuentes.monto).toEqual({ origen: "ia", cita: "pagará una renta mensual de $180,000.00" });
  });

  it("descarta el grupo cuya cita no aparece en el contrato y las fechas inválidas", () => {
    const { valores } = procesarFicha(
      salida({ monto: { monto: 250000, moneda: "MXN", periodo: "mensual", cita: "renta mensual de $250,000.00" }, vigencia: { inicio: "2027-02-30", fin: null, duracion_meses: 36, cita: "contados a partir del 1 de enero de 2027" } }),
      texto,
    );
    expect(valores.monto).toBeUndefined();
    expect(valores.inicio_vigencia).toBeUndefined();
    expect(valores.duracion_meses).toBe(36);
  });

  it("no pisa lo capturado a mano, no borra datos y retira la confirmación si algo cambia", () => {
    const extraida = procesarFicha(salida(), texto);
    const r = aplicarFicha(
      { monto: 175000, aviso_dias: 90, ley_aplicable: "Código Civil para la Ciudad de México", ficha_fuentes: { aviso_dias: { origen: "manual", por: "u1" } }, ficha_confirmada_en: "2026-10-01T00:00:00Z" },
      extraida,
    );
    expect(r.cambios.monto).toBe(180000);
    expect(r.cambios.aviso_dias).toBeUndefined();
    expect(r.cambios.ley_aplicable).toBeUndefined();
    expect(r.fuentes.aviso_dias).toEqual({ origen: "manual", por: "u1" });
    expect(r.desconfirmar).toBe(true);
  });

  it("si nada cambia, la ficha confirmada sigue confirmada", () => {
    const extraida = procesarFicha(salida(), texto);
    const r = aplicarFicha({ ...extraida.valores, ficha_fuentes: extraida.fuentes, ficha_confirmada_en: "2026-10-01T00:00:00Z" }, extraida);
    expect(r.cambios).toEqual({});
    expect(r.desconfirmar).toBe(false);
  });
});

describe("captura de la ficha", async () => {
  const { leerCamposFicha } = await import("@/lib/ficha-campos");
  it("convierte lo capturado al tipo de cada campo", () => {
    expect(
      leerCamposFicha({ monto: "$180,000.50", moneda: "", monto_periodo: "mensual", inicio_vigencia: "2027-01-01", fin_vigencia: "", renovacion_automatica: "si", aviso_dias: "60", aviso_habiles: "habiles", jurisdiccion: "Tribunales — CDMX" }),
    ).toEqual({
      valores: { monto: 180000.5, moneda: "MXN", monto_periodo: "mensual", inicio_vigencia: "2027-01-01", fin_vigencia: null, renovacion_automatica: true, aviso_dias: 60, aviso_habiles: true, jurisdiccion: "Tribunales, CDMX" },
    });
  });
  it("rechaza montos, fechas y plazos inválidos", () => {
    expect(leerCamposFicha({ monto: "mucho" })).toEqual({ error: "El monto debe ser un número." });
    expect(leerCamposFicha({ fin_vigencia: "2027-02-30" })).toEqual({ error: "Revise las fechas de la vigencia." });
    expect(leerCamposFicha({ aviso_dias: "1.5" })).toEqual({ error: "Los plazos deben ser números enteros." });
  });
});
