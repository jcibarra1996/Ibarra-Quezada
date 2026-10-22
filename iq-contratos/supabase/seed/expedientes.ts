// Expedientes corporativos ficticios de la demostración. Todos los nombres, números de
// escritura, notarías, folios y RFC son inventados: las notarías 901 a 903 no existen y
// los documentos son extractos de demostración, no testimonios reales.
//
// El escenario: el expediente de PROVEEDOR XYZ trae los datos reales de su escritura y su
// poder, mientras que el contrato de suministro de la semilla declara datos de relleno
// ("escritura pública número 00000", "Notario Público número 000"). Al analizarlo, la IA
// propone corregir esas declaraciones con los datos del expediente.

import type { ClaveCampo, DatosExpediente, TipoDocumento } from "../../lib/corporativo/campos";

export interface DocumentoSemilla {
  tipo: TipoDocumento;
  archivo: string;
  texto: string;
  resumen: string;
  campos: { clave: ClaveCampo; valor: string; cita: string; pagina: number | null }[];
  rfc?: string;
}

export interface ExpedienteSemilla {
  denominacion: string;
  rfc: string | null;
  es_propia: boolean;
  validado: boolean;
  datos: DatosExpediente;
  documentos: DocumentoSemilla[];
}

const AVISO = "EXTRACTO FICTICIO PARA DEMOSTRACIÓN. NO ES UN TESTIMONIO NOTARIAL.";

export const EXPEDIENTES_DEMO: ExpedienteSemilla[] = [
  {
    denominacion: "EMPRESA CLIENTE, S.A. DE C.V.",
    rfc: "ECL150612AB3",
    es_propia: true,
    validado: true,
    datos: {
      nacionalidad: "mexicana",
      constitucion_escritura: "45,812",
      constitucion_fecha: "2015-06-12",
      constitucion_notario: "Andrea Demo Ruiz",
      constitucion_notaria: "901",
      constitucion_lugar: "la Ciudad de México",
      folio_mercantil: "N-2015099999",
      objeto_social: "la distribución y comercialización de productos de consumo, así como la celebración de los contratos necesarios para su operación",
      representante_nombre: "Ricardo Ejemplo Salas",
      representante_cargo: "Apoderado legal",
      poder_escritura: "51,230",
      poder_fecha: "2022-03-08",
      poder_notario: "Andrea Demo Ruiz",
      poder_notaria: "901",
      poder_lugar: "la Ciudad de México",
      poder_facultades: "Poder general para actos de administración y para pleitos y cobranzas, y para suscribir títulos de crédito",
      domicilio_fiscal: "Calle Demostración número 200, Colonia Centro Demo, Alcaldía Cuauhtémoc, Código Postal 06000, Ciudad de México",
      domicilio: "Calle Demostración número 200, Colonia Centro Demo, Alcaldía Cuauhtémoc, Código Postal 06000, Ciudad de México",
      correo_notificaciones: "juridico@empresa-cliente.example",
    },
    documentos: [],
  },
  {
    denominacion: "PROVEEDOR XYZ, S.A. DE C.V.",
    rfc: "PXY180921KD7",
    es_propia: false,
    validado: true,
    datos: {},
    documentos: [
      {
        tipo: "acta_constitutiva",
        archivo: "Acta constitutiva Proveedor XYZ (extracto).docx",
        resumen: "Extracto de la escritura constitutiva de PROVEEDOR XYZ, S.A. DE C.V., con datos de inscripción y objeto social.",
        texto: `${AVISO}

ESCRITURA PÚBLICA NÚMERO 12,345

En la ciudad de Monterrey, Nuevo León, a 21 de septiembre de 2018, ante mí, Óscar Ficticio Lara, titular de la Notaría Pública número 902 de Monterrey, Nuevo León, se hace constar la constitución de la sociedad mercantil denominada PROVEEDOR XYZ, S.A. DE C.V., de nacionalidad mexicana.

OBJETO SOCIAL. La sociedad tiene por objeto la fabricación, distribución y comercialización de empaques de cartón corrugado y materiales de embalaje.

DOMICILIO. El domicilio social es la ciudad de Monterrey, Nuevo León.

INSCRIPCIÓN. El primer testimonio quedó inscrito en el Registro Público de Comercio bajo el folio mercantil electrónico N-2018077777.`,
        campos: [
          { clave: "nacionalidad", valor: "mexicana", cita: "de nacionalidad mexicana", pagina: 1 },
          { clave: "constitucion_escritura", valor: "12,345", cita: "ESCRITURA PÚBLICA NÚMERO 12,345", pagina: 1 },
          { clave: "constitucion_fecha", valor: "2018-09-21", cita: "a 21 de septiembre de 2018", pagina: 1 },
          { clave: "constitucion_notario", valor: "Óscar Ficticio Lara", cita: "ante mí, Óscar Ficticio Lara", pagina: 1 },
          { clave: "constitucion_notaria", valor: "902", cita: "titular de la Notaría Pública número 902", pagina: 1 },
          { clave: "constitucion_lugar", valor: "Monterrey, Nuevo León", cita: "Notaría Pública número 902 de Monterrey, Nuevo León", pagina: 1 },
          { clave: "folio_mercantil", valor: "N-2018077777", cita: "folio mercantil electrónico N-2018077777", pagina: 1 },
          {
            clave: "objeto_social",
            valor: "la fabricación, distribución y comercialización de empaques de cartón corrugado y materiales de embalaje",
            cita: "La sociedad tiene por objeto la fabricación, distribución y comercialización de empaques",
            pagina: 1,
          },
        ],
      },
      {
        tipo: "poder",
        archivo: "Poder Héctor Demo Garza (extracto).docx",
        resumen: "Extracto del poder general otorgado por PROVEEDOR XYZ, S.A. DE C.V. a su Director General.",
        texto: `${AVISO}

ESCRITURA PÚBLICA NÚMERO 23,456

En la ciudad de Monterrey, Nuevo León, a 17 de enero de 2023, ante mí, Óscar Ficticio Lara, titular de la Notaría Pública número 902 de Monterrey, Nuevo León, PROVEEDOR XYZ, S.A. DE C.V. otorga a favor de Héctor Demo Garza, en su carácter de Director General, poder general para actos de administración y para pleitos y cobranzas, con todas las facultades generales y aun las especiales que requieran cláusula especial conforme a la ley, para ejercerlo en forma individual.`,
        campos: [
          { clave: "representante_nombre", valor: "Héctor Demo Garza", cita: "otorga a favor de Héctor Demo Garza", pagina: 1 },
          { clave: "representante_cargo", valor: "Director General", cita: "en su carácter de Director General", pagina: 1 },
          { clave: "poder_escritura", valor: "23,456", cita: "ESCRITURA PÚBLICA NÚMERO 23,456", pagina: 1 },
          { clave: "poder_fecha", valor: "2023-01-17", cita: "a 17 de enero de 2023", pagina: 1 },
          { clave: "poder_notario", valor: "Óscar Ficticio Lara", cita: "ante mí, Óscar Ficticio Lara", pagina: 1 },
          { clave: "poder_notaria", valor: "902", cita: "Notaría Pública número 902", pagina: 1 },
          { clave: "poder_lugar", valor: "Monterrey, Nuevo León", cita: "de Monterrey, Nuevo León", pagina: 1 },
          {
            clave: "poder_facultades",
            valor: "Poder general para actos de administración y para pleitos y cobranzas, para ejercerlo en forma individual",
            cita: "poder general para actos de administración y para pleitos y cobranzas",
            pagina: 1,
          },
        ],
      },
      {
        tipo: "constancia_fiscal",
        archivo: "Constancia de situación fiscal Proveedor XYZ (demo).docx",
        resumen: "Constancia de situación fiscal ficticia con RFC y domicilio fiscal.",
        rfc: "PXY180921KD7",
        texto: `${AVISO}

CONSTANCIA DE SITUACIÓN FISCAL

Denominación o razón social: PROVEEDOR XYZ
Régimen capital: SOCIEDAD ANÓNIMA DE CAPITAL VARIABLE
RFC: PXY180921KD7

Domicilio fiscal: Avenida Ejemplo número 100, Colonia Industrial Demo, Código Postal 64000, Monterrey, Nuevo León.`,
        campos: [
          {
            clave: "domicilio_fiscal",
            valor: "Avenida Ejemplo número 100, Colonia Industrial Demo, Código Postal 64000, Monterrey, Nuevo León",
            cita: "Domicilio fiscal: Avenida Ejemplo número 100, Colonia Industrial Demo",
            pagina: 1,
          },
          {
            clave: "domicilio",
            valor: "Avenida Ejemplo número 100, Colonia Industrial Demo, Código Postal 64000, Monterrey, Nuevo León",
            cita: "Avenida Ejemplo número 100, Colonia Industrial Demo, Código Postal 64000",
            pagina: 1,
          },
        ],
      },
    ],
  },
  {
    denominacion: "PRESTADORA DE SERVICIOS DEMO, S.A. DE C.V.",
    rfc: null,
    es_propia: false,
    validado: false,
    datos: {},
    documentos: [
      {
        tipo: "acta_constitutiva",
        archivo: "Acta constitutiva Prestadora de Servicios Demo (extracto).docx",
        resumen: "Extracto de la escritura constitutiva. No incluye datos del representante ni de su poder.",
        texto: `${AVISO}

ESCRITURA PÚBLICA NÚMERO 8,910

En la Ciudad de México, a 3 de abril de 2019, ante mí, Beatriz Ejemplo Torres, titular de la Notaría Pública número 903 de la Ciudad de México, se constituye la sociedad PRESTADORA DE SERVICIOS DEMO, S.A. DE C.V., cuyo objeto es la prestación de servicios de mantenimiento a instalaciones industriales y comerciales.`,
        campos: [
          { clave: "constitucion_escritura", valor: "8,910", cita: "ESCRITURA PÚBLICA NÚMERO 8,910", pagina: 1 },
          { clave: "constitucion_fecha", valor: "2019-04-03", cita: "a 3 de abril de 2019", pagina: 1 },
          { clave: "constitucion_notario", valor: "Beatriz Ejemplo Torres", cita: "ante mí, Beatriz Ejemplo Torres", pagina: 1 },
          { clave: "constitucion_notaria", valor: "903", cita: "Notaría Pública número 903", pagina: 1 },
          { clave: "constitucion_lugar", valor: "la Ciudad de México", cita: "número 903 de la Ciudad de México", pagina: 1 },
          {
            clave: "objeto_social",
            valor: "la prestación de servicios de mantenimiento a instalaciones industriales y comerciales",
            cita: "cuyo objeto es la prestación de servicios de mantenimiento",
            pagina: 1,
          },
        ],
      },
    ],
  },
  {
    denominacion: "LOGÍSTICA DEMO, S.A. DE C.V.",
    rfc: "LDE170315HT2",
    es_propia: false,
    validado: true,
    datos: {
      nacionalidad: "mexicana",
      constitucion_escritura: "30,114",
      constitucion_fecha: "2017-03-15",
      constitucion_notario: "Beatriz Ejemplo Torres",
      constitucion_notaria: "903",
      constitucion_lugar: "la Ciudad de México",
      folio_mercantil: "N-2017055555",
      representante_nombre: "Mónica Ficticia Rangel",
      representante_cargo: "Apoderada legal",
      poder_escritura: "41,002",
      poder_fecha: "2024-02-20",
      poder_notario: "Beatriz Ejemplo Torres",
      poder_notaria: "903",
      poder_lugar: "la Ciudad de México",
      poder_facultades: "Poder general para actos de administración",
      domicilio: "Calzada Demo número 45, Colonia Logística Ejemplo, Alcaldía Azcapotzalco, Código Postal 02000, Ciudad de México",
      domicilio_fiscal: "Calzada Demo número 45, Colonia Logística Ejemplo, Alcaldía Azcapotzalco, Código Postal 02000, Ciudad de México",
    },
    documentos: [],
  },
  {
    denominacion: "DESARROLLOS TECNOLÓGICOS DEMO, S.A.P.I. DE C.V.",
    rfc: null,
    es_propia: false,
    validado: false,
    datos: {},
    documentos: [],
  },
];
