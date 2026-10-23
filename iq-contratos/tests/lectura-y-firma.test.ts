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
    });
    expect((f.get("file") as File).name).toBe("contrato.pdf");
    expect(f.get("signatories[0][name]")).toBe("Héctor Demo Garza");
    expect(f.get("signatories[0][tax_id]")).toBe("DEGH800101AB1");
    expect(f.get("signatories[1][email]")).toBe("ricardo@empresa.example");
    expect(f.get("signatories[1][tax_id]")).toBeNull();
    expect(f.get("external_id")).toBe("sol-1");
    expect(f.get("send_invites")).toBe("true");
    // La expiración de documentos no está en todos los planes de Mifiel: no se manda.
    expect(f.get("days_to_expire")).toBeNull();
  });

  it("usa autenticación Basic y el servidor del ambiente configurado", async () => {
    const llamadas: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      llamadas.push({ url, init });
      return new Response(JSON.stringify({ errors: [{ details: "not ready" }] }), { status: 423 });
    });
    const { descargarFirmado } = await import("@/lib/firmas/mifiel");
    expect(await descargarFirmado({ entorno: "sandbox", appId: "app", secreto: "secreto", webhookClave: null }, "doc-1", "pdf")).toBeNull();
    expect(llamadas[0].url).toBe("https://app-sandbox.mifiel.com/api/v1/documents/doc-1/file_signed");
    expect((llamadas[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("app:secreto").toString("base64")}`);
    vi.unstubAllGlobals();
  });

  it("si el plan no permite el mensaje para firmantes, reintenta una vez sin él", async () => {
    const cuerpos: FormData[] = [];
    const respuestas = [
      new Response(JSON.stringify({ status: "error", errors: ["No cuentas con permiso para usar la funcionalidad 'Mensaje personalizado'"] }), { status: 403 }),
      new Response(JSON.stringify({ id: "doc-9", signers: [{ name: "Ana", email: "ana@b.mx", widget_id: "w-1", signed: false }] }), { status: 201 }),
    ];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      cuerpos.push(init.body as FormData);
      return respuestas.shift()!;
    });
    const { crearDocumento } = await import("@/lib/firmas/mifiel");
    const cred = { entorno: "produccion" as const, appId: "app", secreto: "s", webhookClave: null };
    const doc = await crearDocumento(cred, { pdf: Buffer.from("%PDF-1.7"), nombreArchivo: "c.pdf", firmantes: [{ nombre: "Ana", correo: "ana@b.mx" }], externalId: "e1", mensaje: "Hola" });
    expect(doc).toMatchObject({ id: "doc-9", firmantes: [{ widget_id: "w-1" }] });
    expect(cuerpos).toHaveLength(2);
    expect(cuerpos[0].get("message_for_signers")).toBe("Hola");
    expect(cuerpos[1].get("message_for_signers")).toBeNull();

    // Cualquier otro rechazo no se reintenta y llega con la razón de Mifiel.
    cuerpos.length = 0;
    respuestas.push(new Response(JSON.stringify({ errors: [{ details: "File must be a PDF" }] }), { status: 400 }));
    await expect(
      crearDocumento(cred, { pdf: Buffer.from("x"), nombreArchivo: "c.pdf", firmantes: [{ nombre: "Ana", correo: "ana@b.mx" }], externalId: "e2", mensaje: "Hola" }),
    ).rejects.toThrow(/File must be a PDF/);
    expect(cuerpos).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it("valida firmantes antes de enviar", async () => {
    const { validarFirmantes } = await import("@/lib/firmas/solicitudes");
    expect(() => validarFirmantes([])).toThrow(/al menos un firmante/);
    expect(() => validarFirmantes([{ nombre: "A", correo: "no-es-correo" }])).toThrow(/correo/);
    expect(() => validarFirmantes([{ nombre: "A", correo: "a@b.mx", rfc: "123" }])).toThrow(/RFC/);
    expect(() => validarFirmantes([{ nombre: "A", correo: "a@b.mx" }, { nombre: "B", correo: "A@B.mx" }])).toThrow(/repetidos/);
    expect(validarFirmantes([{ nombre: " Ana ", correo: " ANA@B.MX ", rfc: "" }])).toEqual([{ nombre: "Ana", correo: "ana@b.mx", rfc: null, interno: false }]);
    // Quien es de la propia empresa queda marcado para firmar desde el portal.
    expect(validarFirmantes([{ nombre: "Laura", correo: "laura@empresa.mx", interno: true }])[0].interno).toBe(true);
  });
});
