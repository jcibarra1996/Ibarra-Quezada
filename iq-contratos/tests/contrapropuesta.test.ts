import { readFileSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { estructurar, numeroAOrdinal } from "@/lib/parsing/clausulas";
import { procesarAnalisis } from "@/lib/ai/procesar";
import { generarContrapropuesta, piezasDeSeccion } from "@/lib/docx/contrapropuesta";
import { analisisSuministro } from "./fixtures/analisis-suministro";

const texto = readFileSync(path.join(__dirname, "../supabase/seed/contratos/01-suministro-proveedor-xyz.txt"), "utf8");
const doc = estructurar([texto]);
const secciones = doc.secciones.map((s, i) => ({ ...s, id: `s${i}` }));
const r = procesarAnalisis({ salida: analisisSuministro(new Proxy({}, { get: () => "sin-posicion" })), texto: doc.texto, secciones, posicionesValidas: new Set(), hoy: "2026-10-22" });
const jurisdiccion = r.hallazgos.find((h) => h.tema === "Jurisdicción")!;
const intereses = r.hallazgos.find((h) => h.tema === "Intereses moratorios")!;
const penas = r.hallazgos.find((h) => h.tipo === "omision")!;

async function xmlDe(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  return {
    documento: await zip.file("word/document.xml")!.async("string"),
    ajustes: await zip.file("word/settings.xml")!.async("string"),
  };
}

// Texto que se ve al rechazar todos los cambios (texto original) y al aceptarlos todos.
function vistas(xml: string) {
  const cuerpo = xml.replace(/<w:hdr[\s\S]*?<\/w:hdr>/g, "");
  const sinIns = cuerpo.replace(/<w:ins\b[\s\S]*?<\/w:ins>/g, "");
  const sinDel = cuerpo.replace(/<w:del\b[\s\S]*?<\/w:del>/g, "");
  const texto = (x: string) => [...x.matchAll(/<w:(?:t|delText)(?: [^>]*)?>([^<]*)<\/w:(?:t|delText)>/g)].map((m) => m[1]).join("");
  return { rechazado: texto(sinIns), aceptado: texto(sinDel) };
}

const decodificar = (s: string) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&apos;/g, "'");

describe("contrapropuesta en Word", () => {
  it("numera cláusulas nuevas con ordinales", () => {
    expect(numeroAOrdinal(16)).toBe("DÉCIMA SEXTA");
    expect(numeroAOrdinal(20)).toBe("VIGÉSIMA");
    expect(numeroAOrdinal(3)).toBe("TERCERA");
  });

  it("parte la sección en tramos iguales y con cambio", () => {
    const s = secciones.find((x) => x.etiqueta === "DÉCIMA QUINTA")!;
    const piezas = piezasDeSeccion(s, [{ inicio: jurisdiccion.cita_inicio!, fin: jurisdiccion.cita_fin!, nuevo: "X", autor: "A", fecha: "2026-10-22T00:00:00Z" }]);
    expect(piezas.map((p) => p.tipo)).toEqual(["igual", "cambio", "igual"]);
  });

  it("genera control de cambios real atribuido a quien validó", async () => {
    const buffer = await generarContrapropuesta({
      secciones,
      cambios: [
        { inicio: jurisdiccion.cita_inicio!, fin: jurisdiccion.cita_fin!, nuevo: jurisdiccion.redaccion_propuesta, autor: "Carlos Rivas", fecha: "2026-10-22T17:00:00.000Z" },
        { inicio: intereses.cita_inicio!, fin: intereses.cita_fin!, nuevo: "Texto editado por Legal.", autor: "Laura Méndez", fecha: "2026-10-22T18:00:00.000Z" },
      ],
      clausulasNuevas: [{ texto: penas.redaccion_propuesta, autor: "Carlos Rivas", fecha: "2026-10-22T17:05:00.000Z" }],
      organizacion: "EMPRESA CLIENTE, S.A. DE C.V.",
      fecha: "22 de octubre de 2026",
    });
    const { documento, ajustes } = await xmlDe(buffer);
    expect(documento).toMatch(/<w:del [^>]*w:author="Carlos Rivas"/);
    expect(documento).toMatch(/<w:ins [^>]*w:author="Carlos Rivas"/);
    expect(documento).toMatch(/<w:ins [^>]*w:author="Laura Méndez"/);
    expect(documento).toMatch(/w:date="2026-10-22T17:00:00.000Z"/);
    expect(ajustes).toMatch(/<w:trackRevisions\/>/);

    const { rechazado, aceptado } = vistas(documento);
    // Al rechazar todos los cambios se recupera el contrato original (sin saltos de línea).
    const original = doc.texto.replace(/\s+/g, "");
    expect(decodificar(rechazado).replace(/\s+/g, "")).toBe(original);
    // Al aceptarlos, aparece la redacción nueva y desaparece la anterior.
    const final = decodificar(aceptado);
    expect(final).toContain("tribunales competentes de la Ciudad de México");
    expect(final).not.toContain("tribunales competentes de la ciudad de Monterrey");
    expect(final).toContain("Texto editado por Legal.");
    expect(final).not.toContain("tres por ciento mensual");
    expect(final).toContain("DÉCIMA SEXTA.- PENAS CONVENCIONALES.");
    // La cláusula nueva queda antes del cierre de firmas.
    expect(final.indexOf("DÉCIMA SEXTA")).toBeLessThan(final.indexOf("Leído que fue"));
  });

  it("no incluye explicaciones internas de la IA", async () => {
    const buffer = await generarContrapropuesta({
      secciones,
      cambios: [{ inicio: jurisdiccion.cita_inicio!, fin: jurisdiccion.cita_fin!, nuevo: jurisdiccion.redaccion_propuesta, autor: "Carlos Rivas", fecha: "2026-10-22T17:00:00.000Z" }],
      clausulasNuevas: [],
      organizacion: "EMPRESA CLIENTE, S.A. DE C.V.",
      fecha: "22 de octubre de 2026",
    });
    const { documento } = await xmlDe(buffer);
    expect(documento).not.toContain(jurisdiccion.explicacion.slice(0, 30));
  });
});
