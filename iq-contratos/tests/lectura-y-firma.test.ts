import { describe, expect, it, vi } from "vitest";
import { paginasSinTexto, seleccionarPaginas, tieneTexto } from "@/lib/corporativo/paginas";

vi.mock("server-only", () => ({}));

describe("lectura dirigida de instrumentos notariales", () => {
  const relleno = "Texto de estatutos sin datos relevantes para el expediente. ".repeat(10);
  const acta = Array.from({ length: 40 }, () => relleno);
  acta[0] = "ESCRITURA PÚBLICA NÚMERO 12,345. Ante mí, notario...";
  acta[4] = "ARTÍCULO PRIMERO. DENOMINACIÓN. ARTÍCULO SEGUNDO. OBJETO. La sociedad tiene por objeto...";
  acta[33] = "CLÁUSULAS TRANSITORIAS. Se designa ADMINISTRADOR ÚNICO y se otorga PODER general para actos de administración.";
  acta[38] = "Inscrito en el REGISTRO PÚBLICO DE COMERCIO, FOLIO MERCANTIL electrónico N-2018077777.";

  it("lee las primeras y últimas páginas y las que traen los datos, no todo el documento", () => {
    const p = seleccionarPaginas(acta, "acta_constitutiva");
    expect(p.length).toBeLessThanOrEqual(12);
    expect(p).toEqual(expect.arrayContaining([1, 2, 3, 5, 34, 38, 39, 40]));
    expect(p).not.toContain(20);
    expect([...p].sort((a, b) => a - b)).toEqual(p);
  });

  it("en un poder busca otorgamiento, facultades y limitaciones", () => {
    const poder = Array.from({ length: 20 }, () => relleno);
    poder[9] = "OTORGA a favor de... poder general para PLEITOS Y COBRANZAS y ACTOS DE ADMINISTRACIÓN, de forma MANCOMUNADA.";
    expect(seleccionarPaginas(poder, "poder")).toContain(10);
  });

  it("documentos cortos y constancias se leen completos", () => {
    expect(seleccionarPaginas(acta.slice(0, 8), "acta_constitutiva")).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(seleccionarPaginas(acta, "constancia_fiscal")).toHaveLength(40);
  });

  it("en un PDF escaneado toma las primeras y las últimas páginas", () => {
    expect(paginasSinTexto(40)).toEqual([1, 2, 3, 4, 5, 6, 35, 36, 37, 38, 39, 40]);
    expect(paginasSinTexto(5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginasSinTexto(28, 8)).toEqual([1, 2, 3, 4, 25, 26, 27, 28]);
    expect(tieneTexto(["", " ", "x"])).toBe(false);
    expect(tieneTexto(acta)).toBe(true);
  });
});

describe("recorte de un PDF escaneado", () => {
  it("le dice al modelo qué página del original es cada página del recorte", async () => {
    const { correspondencia } = await import("@/lib/corporativo/extraer");
    const t = correspondencia([1, 2, 25, 26], 28);
    expect(t).toContain("La página 3 de este PDF es la página 25 del original.");
    expect(t).toContain("se recibieron completas");
  });
});

describe("Mifiel", () => {
  it("arma el formulario como lo pide la API: archivo, signatories[i][campo], external_id e invitaciones", async () => {
    const { formularioDocumento } = await import("@/lib/firmas/mifiel");
    const f = formularioDocumento({
      pdf: Buffer.from("%PDF-1.7 prueba"),
      nombreArchivo: "contrato.pdf",
      firmantes: [
        { nombre: "Héctor Demo Garza", correo: "hector@proveedor.example", rfc: "DEGH800101AB1" },
        { nombre: "Ricardo Ejemplo Salas", correo: "ricardo@empresa.example" },
      ],
      externalId: "sol-1",
      diasParaVencer: 30,
    });
    expect((f.get("file") as File).name).toBe("contrato.pdf");
    expect(f.get("signatories[0][name]")).toBe("Héctor Demo Garza");
    expect(f.get("signatories[0][tax_id]")).toBe("DEGH800101AB1");
    expect(f.get("signatories[1][email]")).toBe("ricardo@empresa.example");
    expect(f.get("signatories[1][tax_id]")).toBeNull();
    expect(f.get("external_id")).toBe("sol-1");
    expect(f.get("send_invites")).toBe("true");
    expect(f.get("days_to_expire")).toBe("30");
  });

  it("usa autenticación Basic y el servidor del ambiente configurado", async () => {
    process.env.MIFIEL_APP_ID = "app";
    process.env.MIFIEL_APP_SECRET = "secreto";
    process.env.MIFIEL_ENTORNO = "sandbox";
    const llamadas: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      llamadas.push({ url, init });
      return new Response(JSON.stringify({ errors: [{ details: "not ready" }] }), { status: 423 });
    });
    const { descargarFirmado } = await import("@/lib/firmas/mifiel");
    expect(await descargarFirmado("doc-1", "pdf")).toBeNull();
    expect(llamadas[0].url).toBe("https://app-sandbox.mifiel.com/api/v1/documents/doc-1/file_signed");
    expect((llamadas[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("app:secreto").toString("base64")}`);
    vi.unstubAllGlobals();
  });

  it("valida firmantes antes de enviar", async () => {
    const { validarFirmantes } = await import("@/lib/firmas/solicitudes");
    expect(() => validarFirmantes([])).toThrow(/al menos un firmante/);
    expect(() => validarFirmantes([{ nombre: "A", correo: "no-es-correo" }])).toThrow(/correo/);
    expect(() => validarFirmantes([{ nombre: "A", correo: "a@b.mx", rfc: "123" }])).toThrow(/RFC/);
    expect(() => validarFirmantes([{ nombre: "A", correo: "a@b.mx" }, { nombre: "B", correo: "A@B.mx" }])).toThrow(/repetidos/);
    expect(validarFirmantes([{ nombre: " Ana ", correo: " ANA@B.MX ", rfc: "" }])).toEqual([{ nombre: "Ana", correo: "ana@b.mx", rfc: null }]);
  });
});
