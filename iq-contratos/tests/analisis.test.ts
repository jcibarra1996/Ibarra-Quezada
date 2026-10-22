import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { estructurar } from "@/lib/parsing/clausulas";
import { AnalisisSchema } from "@/lib/ai/esquema";
import { procesarAnalisis, sinRayas, validarSalida, ErrorSalidaModelo } from "@/lib/ai/procesar";
import { localizarCita, normalizarParaCita } from "@/lib/ai/verificar-citas";
import { derivarFechas, restarDiasHabiles, sumarMeses } from "@/lib/fechas/calcular";
import { analisisSuministro } from "./fixtures/analisis-suministro";

const texto = readFileSync(path.join(__dirname, "../supabase/seed/contratos/01-suministro-proveedor-xyz.txt"), "utf8");
const doc = estructurar([texto]);
const secciones = doc.secciones.map((s, i) => ({ id: `s${i}`, etiqueta: s.etiqueta, inicio: s.inicio, fin: s.fin }));
const POS = {
  "Intereses moratorios": "p-int",
  "Renovación automática": "p-ren",
  "Terminación anticipada": "p-ter",
  "Limitación de responsabilidad": "p-res",
  Confidencialidad: "p-con",
  Cesión: "p-ces",
  Jurisdicción: "p-jur",
  "Penas convencionales": "p-pen",
};
const posicionesValidas = new Set(Object.values(POS));

describe("validación del JSON del modelo (zod)", () => {
  it("acepta la salida de ejemplo", () => {
    expect(AnalisisSchema.safeParse(analisisSuministro(POS)).success).toBe(true);
  });

  it("rechaza un nivel de riesgo fuera del catálogo", () => {
    const malo = analisisSuministro(POS);
    (malo.hallazgos[0] as { nivel_riesgo: string }).nivel_riesgo = "crítico";
    expect(() => validarSalida(malo)).toThrow(ErrorSalidaModelo);
  });

  it("rechaza un hallazgo sin cita textual", () => {
    const malo = analisisSuministro(POS) as { hallazgos: Record<string, unknown>[] };
    delete malo.hallazgos[0].cita_textual;
    expect(() => validarSalida(malo)).toThrow(ErrorSalidaModelo);
  });

  it("rechaza un tipo de contrato desconocido y campos con tipo equivocado", () => {
    const malo = analisisSuministro(POS) as { clasificacion: { tipo_contrato: string }; fechas_clave: { dias_aviso: unknown }[] };
    malo.clasificacion.tipo_contrato = "joint venture";
    expect(() => validarSalida(malo)).toThrow(ErrorSalidaModelo);
    const otro = analisisSuministro(POS) as { fechas_clave: { dias_aviso: unknown }[] };
    otro.fechas_clave[2].dias_aviso = "noventa";
    expect(() => validarSalida(otro)).toThrow(ErrorSalidaModelo);
  });

  it("rechaza respuestas que no son objetos", () => {
    expect(() => validarSalida(null)).toThrow(ErrorSalidaModelo);
    expect(() => validarSalida("texto libre")).toThrow(ErrorSalidaModelo);
  });
});

describe("ubicación de citas", () => {
  it("encuentra la cita exacta y devuelve su posición en el texto original", () => {
    const cita = "EL PROVEEDOR podrá ceder libremente sus derechos de cobro";
    const u = localizarCita(doc.texto, cita)!;
    expect(doc.texto.slice(u.inicio, u.fin)).toBe(cita);
  });

  it("tolera saltos de línea, espacios dobles y comillas tipográficas", () => {
    const original = 'Las partes acuerdan que "EL PROVEEDOR"\nentregará   los productos.';
    const u = localizarCita(original, "acuerdan que “EL PROVEEDOR” entregará los productos.")!;
    expect(original.slice(u.inicio, u.fin)).toBe('acuerdan que "EL PROVEEDOR"\nentregará   los productos.');
  });

  it("no encuentra citas parafraseadas, con números cambiados o con puntos suspensivos", () => {
    expect(localizarCita(doc.texto, "EL CLIENTE pagará cada factura dentro de los quince días naturales")).toBeNull();
    expect(localizarCita(doc.texto, "EL PROVEEDOR podrá ceder sus derechos libremente a terceros")).toBeNull();
    expect(localizarCita(doc.texto, "intereses moratorios a razón del tres por ciento ... sin necesidad de requerimiento previo")).toBeNull();
  });

  it("no acepta citas demasiado cortas para ubicarse con certeza", () => {
    expect(localizarCita(doc.texto, "EL CLIENTE")).toBeNull();
  });

  it("prefiere la aparición dentro de la cláusula indicada", () => {
    const repetido = "PRIMERA.- Las partes acuerdan pagar puntualmente.\nSEGUNDA.- Las partes acuerdan pagar puntualmente.";
    const u = localizarCita(repetido, "Las partes acuerdan pagar puntualmente.", { inicio: 50, fin: repetido.length })!;
    expect(u.inicio).toBeGreaterThan(50);
  });

  it("la normalización conserva el mapa de posiciones", () => {
    const n = normalizarParaCita("a  \n b");
    expect(n.texto).toBe("a b");
    expect(n.posicion).toEqual([0, 1, 5]);
  });
});

describe("procesamiento del análisis", () => {
  const r = procesarAnalisis({ salida: analisisSuministro(POS), texto: doc.texto, secciones, posicionesValidas, hoy: "2026-10-22" });

  it("descarta el hallazgo cuya cita no existe en el contrato", () => {
    expect(r.descartados_sin_cita).toBe(1);
    expect(r.hallazgos.some((h) => h.tema.includes("inventada"))).toBe(false);
  });

  it("cada hallazgo ubicado apunta exactamente a su cita y a la sección correcta", () => {
    for (const h of r.hallazgos.filter((x) => x.tipo !== "omision")) {
      expect(doc.texto.slice(h.cita_inicio!, h.cita_fin!)).toBe(h.cita);
      const s = secciones.find((x) => x.id === h.section_id)!;
      expect(h.cita_inicio!).toBeGreaterThanOrEqual(s.inicio);
      expect(h.clausula).toBe(s.etiqueta);
    }
  });

  it("numera en orden del documento y deja las omisiones al final", () => {
    expect(r.hallazgos.map((h) => h.numero)).toEqual(r.hallazgos.map((_, i) => i + 1));
    const inicios = r.hallazgos.filter((h) => h.cita_inicio !== null).map((h) => h.cita_inicio!);
    expect([...inicios].sort((a, b) => a - b)).toEqual(inicios);
    expect(r.hallazgos.at(-1)).toMatchObject({ tipo: "omision", cita: null, clausula: "Cláusula nueva" });
  });

  it("detecta los tres puntos del contrato de suministro de la demo", () => {
    const temas = r.hallazgos.map((h) => h.tema);
    expect(temas).toEqual(expect.arrayContaining(["Intereses moratorios", "Renovación automática", "Jurisdicción"]));
    expect(r.riesgo_max).toBe("alto");
  });

  it("anula identificadores de playbook que no existen", () => {
    const salida = analisisSuministro({ ...POS, Cesión: "id-inventado" });
    const r2 = procesarAnalisis({ salida, texto: doc.texto, secciones, posicionesValidas, hoy: "2026-10-22" });
    expect(r2.hallazgos.find((h) => h.tema === "Cesión")?.posicion_id).toBeNull();
  });

  it("calcula la fecha límite del aviso de no renovación", () => {
    const aviso = r.fechas.find((f) => f.tipo === "plazo_aviso" && f.derivada);
    expect(aviso?.fecha).toBe("2026-11-02");
    expect(aviso?.dias_aviso).toBe(90);
  });

  it("quita rayas largas del texto para personas", () => {
    expect(sinRayas("Riesgo alto — revisar")).toBe("Riesgo alto, revisar");
  });
});

describe("fechas derivadas", () => {
  const base = {
    descripcion: "",
    regla: null,
    dias_aviso: null,
    dias_aviso_tipo: null,
    periodo_renovacion_meses: null,
    clausula: "OCTAVA",
    cita_textual: "x",
  } as const;

  it("con renovación automática ya ocurrida, usa el periodo vigente", () => {
    const f = derivarFechas(
      [
        { ...base, tipo: "fin_vigencia", fecha: "2025-01-31" },
        { ...base, tipo: "renovacion_automatica", fecha: null, dias_aviso: 30, dias_aviso_tipo: "naturales", periodo_renovacion_meses: 12 },
      ],
      "2026-10-22",
    );
    expect(f.find((x) => x.tipo === "vencimiento" && x.derivada)?.fecha).toBe("2027-01-31");
    expect(f.find((x) => x.tipo === "plazo_aviso" && x.derivada)?.fecha).toBe("2027-01-01");
  });

  it("descarta fechas mal formadas y no inventa avisos sin fecha de fin", () => {
    const f = derivarFechas([{ ...base, tipo: "fin_vigencia", fecha: "2027-02-30" }, { ...base, tipo: "plazo_aviso", fecha: null, dias_aviso: 30 }], "2026-10-22");
    expect(f.find((x) => x.tipo === "fin_vigencia")?.fecha).toBeNull();
    expect(f.some((x) => x.derivada)).toBe(false);
  });

  it("cuenta días hábiles de lunes a viernes", () => {
    expect(restarDiasHabiles("2026-11-02", 5)).toBe("2026-10-26");
  });

  it("suma meses respetando fin de mes", () => {
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMeses("2027-01-31", 12)).toBe("2028-01-31");
  });
});
