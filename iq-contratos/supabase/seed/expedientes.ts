// Expedientes corporativos ficticios de la demostración. Todos los nombres, números de
// escritura, notarías, folios y RFC son inventados: las notarías 901 a 904 no existen y
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
  // Contraparte del contrato 08 (el caso de la presentación). Su expediente trae a propósito
  // dos diferencias contra el contrato: el poder es la escritura 24,971 (el contrato declara
  // 24,917) y limita al apoderado a contratos de hasta $5,000,000.00 por operación.
  {
    denominacion: "RESINAS TÉCNICAS ORVALLE, S.A. DE C.V.",
    rfc: "RTO190314KJ8",
    es_propia: false,
    validado: false,
    datos: {},
    documentos: [
      {
        tipo: "acta_constitutiva",
        archivo: "Acta constitutiva Resinas Técnicas Orvalle (extracto).docx",
        resumen: "Extracto de la escritura constitutiva de RESINAS TÉCNICAS ORVALLE, S.A. DE C.V., con objeto social, administración e inscripción.",
        texto: `${AVISO}

NOTARÍA PÚBLICA NÚMERO 904

LIC. GONZALO ITURBE MEDINA · SANTIAGO DE QUERÉTARO, QUERÉTARO

ESCRITURA PÚBLICA NÚMERO 18,442

VOLUMEN 612 · CONSTITUCIÓN DE SOCIEDAD ANÓNIMA DE CAPITAL VARIABLE

En la ciudad de Santiago de Querétaro, Querétaro, a 14 de marzo de 2019, ante mí, Gonzalo Iturbe Medina, titular de la Notaría Pública número 904 de Santiago de Querétaro, comparecen la señora Mariana Orvañanos Valle y el señor Héctor Valle Ibargüen, y dijeron que es su voluntad constituir una sociedad anónima de capital variable, de nacionalidad mexicana, que se regirá por los siguientes estatutos.

PRIMERA. DENOMINACIÓN.

La sociedad se denominará RESINAS TÉCNICAS ORVALLE, denominación que irá seguida de las palabras SOCIEDAD ANÓNIMA DE CAPITAL VARIABLE o de su abreviatura S.A. DE C.V.

SEGUNDA. OBJETO SOCIAL.

La sociedad tiene por objeto la fabricación, importación, distribución y comercialización de resinas plásticas, compuestos de polietileno y polipropileno y aditivos para la industria de la transformación, así como la celebración de todos los actos y contratos necesarios para la realización de dicho objeto.

TERCERA. DOMICILIO Y DURACIÓN.

El domicilio de la sociedad será el municipio de El Marqués, Querétaro. La duración de la sociedad será indefinida.

CUARTA. NACIONALIDAD.

La sociedad es mexicana y conviene con cláusula de admisión de extranjeros.

QUINTA. CAPITAL SOCIAL.

El capital social mínimo fijo sin derecho a retiro es de $100,000.00 (cien mil pesos 00/100 M.N.), representado por cien acciones nominativas, íntegramente suscritas y pagadas. El capital variable es ilimitado.

CLÁUSULAS TRANSITORIAS.

Los accionistas designan como Administradora Única a la señora Mariana Orvañanos Valle y como Comisario al contador público Fernando Lugo Arriaga.

INSCRIPCIÓN.

El primer testimonio de esta escritura quedó inscrito en el Registro Público de Comercio de Querétaro bajo el folio mercantil electrónico N-2019021553, el 2 de abril de 2019.

DOY FE.`,
        campos: [
          { clave: "nacionalidad", valor: "mexicana", cita: "La sociedad es mexicana", pagina: 1 },
          { clave: "constitucion_escritura", valor: "18,442", cita: "ESCRITURA PÚBLICA NÚMERO 18,442", pagina: 1 },
          { clave: "constitucion_fecha", valor: "2019-03-14", cita: "a 14 de marzo de 2019", pagina: 1 },
          { clave: "constitucion_notario", valor: "Gonzalo Iturbe Medina", cita: "ante mí, Gonzalo Iturbe Medina", pagina: 1 },
          { clave: "constitucion_notaria", valor: "904", cita: "titular de la Notaría Pública número 904", pagina: 1 },
          { clave: "constitucion_lugar", valor: "Santiago de Querétaro, Querétaro", cita: "Notaría Pública número 904 de Santiago de Querétaro", pagina: 1 },
          { clave: "folio_mercantil", valor: "N-2019021553", cita: "folio mercantil electrónico N-2019021553", pagina: 1 },
          { clave: "objeto_social", valor: "la fabricación, importación, distribución y comercialización de resinas plásticas, compuestos de polietileno y polipropileno y aditivos para la industria de la transformación", cita: "La sociedad tiene por objeto la fabricación, importación, distribución y comercialización de resinas plásticas", pagina: 1 },
        ],
      },
      {
        tipo: "poder",
        archivo: "Poder Arturo Benavides Quiroga (extracto).docx",
        resumen: "Extracto del poder otorgado por RESINAS TÉCNICAS ORVALLE, S.A. DE C.V. a su Apoderado Legal y Gerente Comercial, con límite de monto por operación.",
        texto: `${AVISO}

NOTARÍA PÚBLICA NÚMERO 904

LIC. GONZALO ITURBE MEDINA · SANTIAGO DE QUERÉTARO, QUERÉTARO

ESCRITURA PÚBLICA NÚMERO 24,971

VOLUMEN 788 · OTORGAMIENTO DE PODER

En la ciudad de Santiago de Querétaro, Querétaro, a 2 de agosto de 2023, ante mí, Gonzalo Iturbe Medina, titular de la Notaría Pública número 904 de Santiago de Querétaro, comparece RESINAS TÉCNICAS ORVALLE, S.A. DE C.V., representada por su Administradora Única, la señora Mariana Orvañanos Valle, y otorga a favor del señor Arturo Benavides Quiroga, en su carácter de Apoderado Legal y Gerente Comercial, las siguientes facultades.

PRIMERA. PLEITOS Y COBRANZAS.

Poder general para pleitos y cobranzas, con todas las facultades generales y aun las especiales que conforme a la ley requieran cláusula especial, en términos del primer párrafo del artículo 2554 del Código Civil Federal y sus correlativos de los Códigos Civiles de las entidades federativas.

SEGUNDA. ACTOS DE ADMINISTRACIÓN.

Poder general para actos de administración, en términos del segundo párrafo del artículo 2554 del Código Civil Federal y sus correlativos, con la limitación de que el apoderado solo podrá celebrar contratos cuyo monto no exceda de $5,000,000.00 (cinco millones de pesos 00/100 M.N.) por operación. Para operaciones de monto mayor deberá actuar de forma mancomunada con la Administradora Única.

TERCERA. LIMITACIONES.

El apoderado no tendrá facultades para actos de dominio ni para otorgar, suscribir, endosar o avalar títulos de crédito.

DOY FE.`,
        campos: [
          { clave: "representante_nombre", valor: "Arturo Benavides Quiroga", cita: "otorga a favor del señor Arturo Benavides Quiroga", pagina: 1 },
          { clave: "representante_cargo", valor: "Apoderado Legal y Gerente Comercial", cita: "en su carácter de Apoderado Legal y Gerente Comercial", pagina: 1 },
          { clave: "poder_escritura", valor: "24,971", cita: "ESCRITURA PÚBLICA NÚMERO 24,971", pagina: 1 },
          { clave: "poder_fecha", valor: "2023-08-02", cita: "a 2 de agosto de 2023", pagina: 1 },
          { clave: "poder_notario", valor: "Gonzalo Iturbe Medina", cita: "ante mí, Gonzalo Iturbe Medina", pagina: 1 },
          { clave: "poder_notaria", valor: "904", cita: "titular de la Notaría Pública número 904", pagina: 1 },
          { clave: "poder_lugar", valor: "Santiago de Querétaro, Querétaro", cita: "Notaría Pública número 904 de Santiago de Querétaro", pagina: 1 },
          { clave: "poder_facultades", valor: "Poder general para pleitos y cobranzas y para actos de administración; solo puede celebrar contratos de hasta $5,000,000.00 por operación (montos mayores, de forma mancomunada con la Administradora Única); sin actos de dominio ni títulos de crédito", cita: "solo podrá celebrar contratos cuyo monto no exceda de $5,000,000.00", pagina: 1 },
        ],
      },
      {
        tipo: "constancia_fiscal",
        archivo: "Constancia de situación fiscal Resinas Técnicas Orvalle (demo).docx",
        resumen: "Constancia de situación fiscal ficticia con RFC, régimen y domicilio fiscal.",
        rfc: "RTO190314KJ8",
        texto: `${AVISO}

CONSTANCIA DE SITUACIÓN FISCAL

FORMATO DE DEMOSTRACIÓN

RFC: RTO190314KJ8
Denominación o razón social: RESINAS TÉCNICAS ORVALLE
Régimen capital: SOCIEDAD ANÓNIMA DE CAPITAL VARIABLE
Fecha de inicio de operaciones: 20 de marzo de 2019
Estatus en el padrón: ACTIVO
Régimen: Régimen General de Ley Personas Morales
Actividad económica: Fabricación de resinas sintéticas y compuestos plásticos

DATOS DEL DOMICILIO REGISTRADO

Domicilio fiscal: Avenida de la Industria número 1240, Parque Industrial Bernardo Quintana, Código Postal 76246, El Marqués, Querétaro.

Lugar y fecha de emisión: El Marqués, Querétaro, a 6 de octubre de 2026.`,
        campos: [
          { clave: "domicilio_fiscal", valor: "Avenida de la Industria número 1240, Parque Industrial Bernardo Quintana, Código Postal 76246, El Marqués, Querétaro", cita: "Domicilio fiscal: Avenida de la Industria número 1240", pagina: 1 },
          { clave: "domicilio", valor: "Avenida de la Industria número 1240, Parque Industrial Bernardo Quintana, Código Postal 76246, El Marqués, Querétaro", cita: "Avenida de la Industria número 1240, Parque Industrial Bernardo Quintana, Código Postal 76246", pagina: 1 },
        ],
      },
    ],
  },
];
