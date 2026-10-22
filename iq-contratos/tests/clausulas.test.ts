import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canonizarOrdinal, estructurar, ordinalANumero } from "@/lib/parsing/clausulas";

const semilla = (nombre: string) => readFileSync(path.join(__dirname, "../supabase/seed/contratos", nombre), "utf8");

describe("ordinales", () => {
  it("canoniza variantes con y sin acento y formas pegadas", () => {
    expect(canonizarOrdinal("SEPTIMA")).toBe("SÉPTIMA");
    expect(canonizarOrdinal("DECIMA PRIMERA")).toBe("DÉCIMA PRIMERA");
    expect(canonizarOrdinal("DÉCIMO-SEGUNDA")).toBe("DÉCIMA SEGUNDA");
    expect(canonizarOrdinal("DECIMOPRIMERA")).toBe("DÉCIMA PRIMERA");
    expect(canonizarOrdinal("VIGÉSIMA   TERCERA")).toBe("VIGÉSIMA TERCERA");
  });

  it("convierte ordinales a número", () => {
    expect(ordinalANumero("PRIMERA")).toBe(1);
    expect(ordinalANumero("NOVENA")).toBe(9);
    expect(ordinalANumero("DÉCIMA")).toBe(10);
    expect(ordinalANumero("UNDÉCIMA")).toBe(11);
    expect(ordinalANumero("DUODÉCIMA")).toBe(12);
    expect(ordinalANumero("DÉCIMA QUINTA")).toBe(15);
    expect(ordinalANumero("VIGÉSIMA PRIMERA")).toBe(21);
    expect(ordinalANumero("CLÁUSULA 7")).toBe(7);
    expect(ordinalANumero("OBJETO")).toBeNull();
  });
});

describe("estructura de un contrato de suministro (semilla)", () => {
  const doc = estructurar([semilla("01-suministro-proveedor-xyz.txt")], { caracteresPorPaginaVirtual: 3200 });
  const clausulas = doc.secciones.filter((s) => s.tipo === "clausula");
  const declaraciones = doc.secciones.filter((s) => s.tipo === "declaracion");

  it("separa proemio, declaraciones, cláusulas y cierre en orden", () => {
    expect(doc.secciones[0].tipo).toBe("proemio");
    expect(doc.secciones.at(-1)?.tipo).toBe("cierre");
    expect(declaraciones.map((d) => d.etiqueta)).toEqual(["DECLARACIÓN I", "DECLARACIÓN II", "DECLARACIÓN III"]);
  });

  it("detecta las quince cláusulas con su ordinal y título", () => {
    expect(clausulas).toHaveLength(15);
    expect(clausulas.map((c) => ordinalANumero(c.etiqueta))).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    expect(clausulas[4]).toMatchObject({ etiqueta: "QUINTA", titulo: "INTERESES MORATORIOS" });
    expect(clausulas[14]).toMatchObject({ etiqueta: "DÉCIMA QUINTA", titulo: "JURISDICCIÓN Y LEGISLACIÓN APLICABLE" });
  });

  it("mantiene los incisos dentro de su declaración", () => {
    expect(declaraciones[0].texto).toContain("a) Es una sociedad mercantil");
    expect(declaraciones[0].texto).toContain("e) Señala como domicilio");
    expect(declaraciones[1].texto.startsWith("II. Declara EL CLIENTE")).toBe(true);
  });

  it("las posiciones de cada sección apuntan exactamente a su texto", () => {
    for (const s of doc.secciones) expect(doc.texto.slice(s.inicio, s.fin)).toBe(s.texto);
  });

  it("genera páginas virtuales para documentos sin paginación", () => {
    expect(doc.paginasVirtuales).toBe(true);
    expect(doc.paginas).toBeGreaterThan(1);
    const paginas = doc.secciones.map((s) => s.pagina);
    expect([...paginas].sort((a, b) => a - b)).toEqual(paginas);
  });
});

describe("variantes de redacción", () => {
  it("reconoce CLÁUSULA + ordinal, ordinales compuestos y encabezados espaciados", () => {
    const texto = [
      "CONTRATO DE PRESTACIÓN DE SERVICIOS",
      "",
      "D E C L A R A C I O N E S",
      "",
      "I.- Declara EL PRESTADOR que es una sociedad mexicana.",
      "II.- Declara LA EMPRESA que requiere los servicios.",
      "",
      "C L Á U S U L A S",
      "",
      "CLÁUSULA PRIMERA. Objeto. EL PRESTADOR prestará los servicios.",
      "CLÁUSULA SEGUNDA: La vigencia será de un año.",
      "DECIMOPRIMERA.- CESIÓN. Ninguna parte podrá ceder.",
      "VIGÉSIMA SEGUNDA. JURISDICCIÓN. Tribunales de la Ciudad de México.",
    ].join("\n");
    const doc = estructurar([texto]);
    const etiquetas = doc.secciones.filter((s) => s.tipo === "clausula").map((s) => s.etiqueta);
    expect(etiquetas).toEqual(["PRIMERA", "SEGUNDA", "DÉCIMA PRIMERA", "VIGÉSIMA SEGUNDA"]);
    expect(doc.secciones.filter((s) => s.tipo === "declaracion").map((s) => s.etiqueta)).toEqual([
      "DECLARACIÓN I",
      "DECLARACIÓN II",
    ]);
    const cesion = doc.secciones.find((s) => s.etiqueta === "DÉCIMA PRIMERA");
    expect(cesion?.titulo).toBe("CESIÓN");
  });

  it("reconoce cláusulas numeradas", () => {
    const doc = estructurar(["DECLARACIONES\nI. Declara LA EMPRESA algo.\nCLÁUSULAS\nCLÁUSULA 1.- OBJETO. Uno.\nCLÁUSULA 2.- PRECIO. Dos."]);
    expect(doc.secciones.filter((s) => s.tipo === "clausula").map((s) => s.etiqueta)).toEqual(["CLÁUSULA 1", "CLÁUSULA 2"]);
  });

  it("no confunde un ordinal en minúsculas o dentro de una oración con una cláusula", () => {
    const texto = [
      "CLÁUSULAS",
      "PRIMERA.- OBJETO. Las partes acuerdan lo siguiente.",
      "primera entrega se hará en marzo y la SEGUNDA entrega en abril.",
      "SEGUNDA.- PRECIO. El precio es fijo.",
    ].join("\n");
    const clausulas = estructurar([texto]).secciones.filter((s) => s.tipo === "clausula");
    expect(clausulas.map((c) => c.etiqueta)).toEqual(["PRIMERA", "SEGUNDA"]);
    expect(clausulas[0].texto).toContain("primera entrega se hará en marzo");
  });

  it("no abre cláusulas en el proemio aunque aparezca un ordinal", () => {
    const doc = estructurar(["PRIMERA ADENDA AL CONTRATO DE SUMINISTRO\nDECLARACIONES\nI. Declara algo.\nCLÁUSULAS\nPRIMERA.- OBJETO. Texto."]);
    expect(doc.secciones[0]).toMatchObject({ tipo: "proemio" });
    expect(doc.secciones[0].texto).toContain("PRIMERA ADENDA");
    expect(doc.secciones.filter((s) => s.tipo === "clausula")).toHaveLength(1);
  });
});

describe("texto extraído de PDF", () => {
  const pagina1 = [
    "CONTRATO DE SUMINISTRO QUE CELEBRAN PROVEEDOR XYZ, S.A. DE C.V. Y",
    "EMPRESA CLIENTE, S.A. DE C.V.",
    "",
    "CLÁUSULAS",
    "",
    "PRIMERA.- OBJETO. EL PROVEEDOR se obliga a suministrar los produc-",
    "tos descritos en el Anexo A, en las cantidades que EL CLIENTE",
    "solicite.",
    "",
    "1",
  ].join("\n");
  const pagina2 = ["Página 2 de 2", "SEGUNDA.- PRECIO. El precio será el de la lista vigente.", ""].join("\n");
  const doc = estructurar([pagina1, pagina2], { reflujo: true });

  it("une renglones cortados y palabras con guion", () => {
    const primera = doc.secciones.find((s) => s.etiqueta === "PRIMERA");
    expect(primera?.texto).toBe(
      "PRIMERA.- OBJETO. EL PROVEEDOR se obliga a suministrar los productos descritos en el Anexo A, en las cantidades que EL CLIENTE solicite.",
    );
  });

  it("no toma como encabezado la palabra CLÁUSULAS al final de la oración del proemio", () => {
    const d = estructurar(
      ["CONTRATO QUE CELEBRAN LAS PARTES AL TENOR DE LAS SIGUIENTES DECLARACIONES Y\nCLÁUSULAS:\n\nDECLARACIONES\n\nI. Declara algo.\n\nCLÁUSULAS\n\nPRIMERA.- OBJETO. Texto."],
      { reflujo: true },
    );
    expect(d.secciones.map((s) => s.tipo)).toEqual(["proemio", "encabezado", "declaracion", "encabezado", "clausula"]);
    expect(d.secciones[0].texto.endsWith("DECLARACIONES Y CLÁUSULAS:")).toBe(true);
  });

  it("quita números de página y asigna la página real a cada cláusula", () => {
    expect(doc.texto).not.toMatch(/Página 2 de 2/);
    expect(doc.texto).not.toMatch(/\n1\n/);
    expect(doc.paginas).toBe(2);
    expect(doc.secciones.find((s) => s.etiqueta === "PRIMERA")?.pagina).toBe(1);
    expect(doc.secciones.find((s) => s.etiqueta === "SEGUNDA")?.pagina).toBe(2);
  });
});

describe("las cinco semillas", () => {
  it.each([
    ["01-suministro-proveedor-xyz.txt", 15],
    ["02-servicios-mantenimiento.txt", 13],
    ["03-arrendamiento-oficinas.txt", 10],
    ["04-confidencialidad-tecnologia.txt", 8],
    ["05-servicios-logistica.txt", 10],
  ])("%s tiene %i cláusulas consecutivas", (archivo, total) => {
    const clausulas = estructurar([semilla(archivo)]).secciones.filter((s) => s.tipo === "clausula");
    expect(clausulas.map((c) => ordinalANumero(c.etiqueta))).toEqual(Array.from({ length: total }, (_, i) => i + 1));
  });
});
