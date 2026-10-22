// Plantillas base que se precargan en una organización nueva. Están redactadas desde la
// posición de la empresa (la parte "propia"), siguen las posiciones preferidas del playbook
// de ejemplo y no citan artículos de ley a propósito. Son un punto de partida que la
// dirección jurídica debe revisar y aprobar antes de usarlas con terceros.

import type { CampoNegocio, RolPlantilla } from "./llenar";
import type { TipoContrato } from "@/lib/tipos";

export interface PlantillaBase {
  tipo_contrato: TipoContrato;
  nombre: string;
  descripcion: string;
  roles: RolPlantilla[];
  campos: CampoNegocio[];
  cuerpo: string;
}

const DIAS_NATURALES: [string, string] = ["día natural", "días naturales"];
const DIAS_HABILES: [string, string] = ["día hábil", "días hábiles"];
const MESES: [string, string] = ["mes", "meses"];
const ANOS: [string, string] = ["año", "años"];

const fechaInicio: CampoNegocio = { clave: "fecha_inicio", etiqueta: "Fecha de inicio de vigencia", tipo: "fecha", requerido: true };
const vigencia: CampoNegocio = { clave: "vigencia", etiqueta: "Vigencia", tipo: "entero", unidad: MESES, predeterminado: "12", requerido: true };
const plazoPago: CampoNegocio = {
  clave: "plazo_pago",
  etiqueta: "Plazo de pago",
  tipo: "entero",
  unidad: DIAS_NATURALES,
  predeterminado: "30",
  ayuda: "Días naturales contados a partir de que se recibe la factura.",
};

// Cláusulas finales comunes. Cada plantilla las numera en su lugar.
const casoFortuito = (n: string) =>
  `${n}.- CASO FORTUITO O FUERZA MAYOR. Ninguna de LAS PARTES será responsable del incumplimiento de sus obligaciones cuando éste derive de caso fortuito o fuerza mayor, siempre que lo notifique por escrito a la otra parte dentro de los cinco días naturales siguientes a que tenga conocimiento del evento y tome las medidas razonables para mitigar sus efectos. Si el evento se prolonga por más de treinta días naturales, cualquiera de LAS PARTES podrá dar por terminado el presente contrato sin responsabilidad, mediante aviso por escrito.`;

const notificaciones = (n: string) =>
  `${n}.- NOTIFICACIONES. Todas las notificaciones entre LAS PARTES deberán hacerse por escrito y entregarse en los domicilios señalados en las declaraciones, o enviarse por correo electrónico a las direcciones que cada parte designe por escrito, con acuse de recibo. Mientras una parte no notifique a la otra el cambio de su domicilio, las notificaciones hechas en el domicilio señalado surtirán plenos efectos.`;

const modificaciones = (n: string) =>
  `${n}.- MODIFICACIONES. Cualquier modificación al presente contrato deberá constar por escrito y estar firmada por representantes de LAS PARTES con facultades suficientes. Este contrato y sus anexos contienen la totalidad de lo convenido por LAS PARTES respecto de su objeto.`;

const vicios = (n: string) =>
  `${n}.- AUSENCIA DE VICIOS DEL CONSENTIMIENTO. LAS PARTES manifiestan que en la celebración del presente contrato no existe error, dolo, mala fe, violencia ni cualquier otro vicio del consentimiento que pudiera afectar su validez.`;

const jurisdiccionCdmx = (n: string) =>
  `${n}.- JURISDICCIÓN Y LEGISLACIÓN APLICABLE. Para la interpretación y cumplimiento del presente contrato, LAS PARTES se someten a la legislación aplicable y a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando expresamente a cualquier otro fuero que por razón de sus domicilios presentes o futuros pudiera corresponderles.`;

const cesion = (n: string, empresa: string) =>
  `${n}.- CESIÓN. Ninguna de LAS PARTES podrá ceder o transmitir los derechos u obligaciones derivados del presente contrato sin el consentimiento previo y por escrito de la otra parte. No obstante, ${empresa} podrá ceder el contrato a cualquiera de sus sociedades afiliadas mediante simple aviso por escrito a la otra parte.`;

const confidencialidad = (n: string) =>
  `${n}.- CONFIDENCIALIDAD. Cada una de LAS PARTES mantendrá en estricta confidencialidad la información técnica, comercial, financiera y operativa que reciba de la otra con motivo del presente contrato, y la utilizará únicamente para su cumplimiento. Esta obligación subsistirá durante la vigencia del contrato y durante cinco años posteriores a su terminación, y no aplicará a la información que sea del dominio público sin culpa de la parte receptora o que deba revelarse por mandato de autoridad competente.`;

const intereses = (n: string) =>
  `${n}.- INTERESES MORATORIOS. En caso de que alguna de LAS PARTES no cubra en la fecha de su vencimiento cualquier cantidad líquida y exigible a su cargo, la otra parte le requerirá el pago por escrito. Si el adeudo no se cubre dentro de los quince días naturales siguientes a dicho requerimiento, la parte morosa pagará intereses moratorios a razón del uno punto cinco por ciento mensual sobre el saldo insoluto, calculados por los días efectivamente transcurridos hasta la fecha de pago. Los intereses no se capitalizarán.`;

const responsabilidad = (n: string) =>
  `${n}.- RESPONSABILIDAD. Cada una de LAS PARTES será responsable de los daños y perjuicios que cause a la otra por el incumplimiento de sus obligaciones. La responsabilidad total de cada parte no excederá del monto total de las contraprestaciones pagadas o pagaderas en los doce meses anteriores al hecho que la origine. Este límite no será aplicable en casos de dolo, mala fe o negligencia grave, ni respecto de las obligaciones de confidencialidad, propiedad intelectual y laborales previstas en este contrato.`;

const vigenciaYRenovacion = (n: string) =>
  `${n}.- VIGENCIA. El presente contrato tendrá una vigencia de {{negocio.vigencia}} contados a partir del {{negocio.fecha_inicio}}. Al término de dicho plazo, el contrato podrá renovarse por un periodo igual mediante convenio por escrito firmado por LAS PARTES. Cualquiera de ellas podrá manifestar su intención de no renovarlo mediante aviso por escrito con al menos treinta días naturales de anticipación a la fecha de vencimiento.`;

const cierre = `Leído que fue el presente contrato y enteradas LAS PARTES de su contenido y alcance legal, lo firman por duplicado en {{lugar_firma}}, el {{fecha_firma}}.

{{firmas}}`;

const declaracionComun = `III. Declaran LAS PARTES que se reconocen mutuamente la personalidad con la que comparecen y que es su voluntad celebrar el presente contrato.`;

// ---------------------------------------------------------------------------

const servicios: PlantillaBase = {
  tipo_contrato: "prestacion_servicios",
  nombre: "Contrato de prestación de servicios",
  descripcion: "Para contratar servicios profesionales o especializados. La empresa es EL CLIENTE.",
  roles: [
    {
      clave: "prestador",
      termino: "EL PRESTADOR",
      etiqueta: "Prestador de servicios",
      propia: false,
      declaraciones: [
        "Cuenta con la capacidad técnica, la experiencia, los recursos materiales y el personal necesarios para prestar los servicios objeto del presente contrato.",
        "Es el único patrón del personal que asignará a la prestación de dichos servicios y cumple con las obligaciones laborales, fiscales y de seguridad social a su cargo.",
        "En caso de que dichos servicios califiquen como servicios especializados conforme a la legislación laboral, cuenta con el registro vigente correspondiente ante la Secretaría del Trabajo y Previsión Social.",
      ],
    },
    {
      clave: "cliente",
      termino: "EL CLIENTE",
      etiqueta: "Cliente",
      propia: true,
      declaraciones: ["Requiere los servicios objeto del presente contrato para el desarrollo de sus actividades y cuenta con los recursos para cubrir la contraprestación pactada."],
    },
  ],
  campos: [
    { clave: "descripcion_servicios", etiqueta: "Descripción de los servicios", tipo: "largo", requerido: true, ayuda: "Qué hará el prestador, con qué alcance y entregables." },
    { clave: "contraprestacion", etiqueta: "Contraprestación mensual (antes de IVA)", tipo: "importe", requerido: true },
    plazoPago,
    fechaInicio,
    vigencia,
  ],
  cuerpo: `CONTRATO DE PRESTACIÓN DE SERVICIOS QUE CELEBRAN, POR UNA PARTE, {{prestador.proemio}}, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL PRESTADOR", Y POR LA OTRA, {{cliente.proemio}}, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL CLIENTE", Y CONJUNTAMENTE "LAS PARTES", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:

DECLARACIONES

I. Declara EL PRESTADOR, {{prestador.comparecencia}}, que:

{{prestador.declaraciones}}

II. Declara EL CLIENTE, {{cliente.comparecencia}}, que:

{{cliente.declaraciones}}

${declaracionComun}

CLÁUSULAS

PRIMERA.- OBJETO. EL PRESTADOR se obliga a prestar a EL CLIENTE los servicios consistentes en {{negocio.descripcion_servicios}} (en lo sucesivo, "LOS SERVICIOS"), con la calidad, oportunidad y diligencia que su naturaleza requiere, y EL CLIENTE se obliga a pagar la contraprestación pactada en este contrato.

SEGUNDA.- CONTRAPRESTACIÓN. Como contraprestación por LOS SERVICIOS, EL CLIENTE pagará a EL PRESTADOR la cantidad mensual de {{negocio.contraprestacion}}, más el Impuesto al Valor Agregado. Dicha cantidad será fija durante la vigencia del contrato y comprende todos los gastos en que EL PRESTADOR incurra para prestar LOS SERVICIOS.

TERCERA.- FORMA DE PAGO. EL CLIENTE pagará cada mensualidad dentro de los {{negocio.plazo_pago}} siguientes a la recepción del comprobante fiscal digital por Internet (CFDI) correspondiente, que deberá cumplir con los requisitos fiscales aplicables, mediante transferencia electrónica a la cuenta bancaria que EL PRESTADOR designe por escrito.

${vigenciaYRenovacion("CUARTA")}

QUINTA.- TERMINACIÓN ANTICIPADA. EL CLIENTE podrá dar por terminado el presente contrato en cualquier momento, sin necesidad de declaración judicial y sin responsabilidad a su cargo, mediante aviso por escrito con treinta días naturales de anticipación. En tal caso, EL CLIENTE pagará únicamente LOS SERVICIOS efectivamente prestados hasta la fecha de terminación. EL PRESTADOR solo podrá dar por terminado anticipadamente el contrato mediante aviso por escrito con noventa días naturales de anticipación.

${intereses("SEXTA")}

${responsabilidad("SÉPTIMA")}

OCTAVA.- RESPONSABILIDAD LABORAL. EL PRESTADOR será el único patrón del personal que asigne a la prestación de LOS SERVICIOS y será el único responsable de las obligaciones laborales, fiscales y de seguridad social respecto de dicho personal. EL PRESTADOR se obliga a sacar en paz y a salvo a EL CLIENTE de cualquier reclamación que dicho personal presente en su contra. En caso de que LOS SERVICIOS califiquen como servicios especializados conforme a la legislación laboral aplicable, EL PRESTADOR se obliga a mantener vigente durante la vigencia del contrato el registro correspondiente ante la autoridad competente y a entregar a EL CLIENTE la documentación que lo acredite cuando éste lo solicite.

${confidencialidad("NOVENA")}

DÉCIMA.- PROPIEDAD INTELECTUAL. Los entregables, reportes, bases de datos y demás materiales que EL PRESTADOR elabore específicamente para EL CLIENTE con motivo del presente contrato serán propiedad de EL CLIENTE. EL PRESTADOR conservará la titularidad de las herramientas, metodologías y conocimientos que tuviera antes de la firma de este contrato y otorga a EL CLIENTE una licencia perpetua, gratuita y no exclusiva para utilizarlos en la medida necesaria para aprovechar los entregables.

DÉCIMA PRIMERA.- PENAS CONVENCIONALES. En caso de retraso o deficiencia en la prestación de LOS SERVICIOS imputable a EL PRESTADOR, éste pagará a EL CLIENTE una pena convencional equivalente al uno por ciento de la contraprestación mensual por cada día natural de retraso, sin que el total de las penas de un mes exceda del diez por ciento de dicha contraprestación. EL CLIENTE podrá descontar las penas de los pagos pendientes, previa notificación por escrito.

${cesion("DÉCIMA SEGUNDA", "EL CLIENTE")}

${casoFortuito("DÉCIMA TERCERA")}

${notificaciones("DÉCIMA CUARTA")}

${modificaciones("DÉCIMA QUINTA")}

${vicios("DÉCIMA SEXTA")}

${jurisdiccionCdmx("DÉCIMA SÉPTIMA")}

${cierre}`,
};

// ---------------------------------------------------------------------------

const suministro: PlantillaBase = {
  tipo_contrato: "suministro",
  nombre: "Contrato de suministro",
  descripcion: "Para la compra periódica de productos mediante órdenes de compra. La empresa es EL CLIENTE.",
  roles: [
    {
      clave: "proveedor",
      termino: "EL PROVEEDOR",
      etiqueta: "Proveedor",
      propia: false,
      declaraciones: ["Cuenta con la capacidad técnica, los recursos materiales y el personal necesarios para fabricar, en su caso, y suministrar los productos objeto del presente contrato en las cantidades, calidades y plazos pactados."],
    },
    {
      clave: "cliente",
      termino: "EL CLIENTE",
      etiqueta: "Cliente",
      propia: true,
      declaraciones: ["Requiere el suministro periódico de los productos objeto del presente contrato para sus operaciones."],
    },
  ],
  campos: [
    { clave: "productos", etiqueta: "Productos a suministrar", tipo: "largo", requerido: true, ayuda: "Descripción general; el detalle técnico puede ir en el Anexo A." },
    {
      clave: "precios",
      etiqueta: "Precios",
      tipo: "largo",
      predeterminado: "los establecidos en la lista de precios que, firmada por LAS PARTES, se agrega como Anexo B",
    },
    { clave: "plazo_entrega", etiqueta: "Plazo de entrega", tipo: "entero", unidad: DIAS_NATURALES, predeterminado: "10", ayuda: "Días naturales a partir de la orden de compra." },
    { clave: "plazo_inspeccion", etiqueta: "Plazo para reportar defectos", tipo: "entero", unidad: DIAS_HABILES, predeterminado: "10" },
    plazoPago,
    fechaInicio,
    vigencia,
  ],
  cuerpo: `CONTRATO DE SUMINISTRO QUE CELEBRAN, POR UNA PARTE, {{proveedor.proemio}}, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL PROVEEDOR", Y POR LA OTRA, {{cliente.proemio}}, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL CLIENTE", Y CONJUNTAMENTE "LAS PARTES", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:

DECLARACIONES

I. Declara EL PROVEEDOR, {{proveedor.comparecencia}}, que:

{{proveedor.declaraciones}}

II. Declara EL CLIENTE, {{cliente.comparecencia}}, que:

{{cliente.declaraciones}}

${declaracionComun}

CLÁUSULAS

PRIMERA.- OBJETO. EL PROVEEDOR se obliga a suministrar a EL CLIENTE, de manera periódica, {{negocio.productos}}, conforme a las especificaciones del Anexo A (en lo sucesivo, "LOS PRODUCTOS"), en las cantidades y fechas que EL CLIENTE solicite mediante órdenes de compra, y EL CLIENTE se obliga a pagar el precio correspondiente en los términos de este contrato. El presente contrato no obliga a EL CLIENTE a adquirir volúmenes mínimos.

SEGUNDA.- ÓRDENES DE COMPRA. EL CLIENTE emitirá órdenes de compra por escrito o por correo electrónico. EL PROVEEDOR deberá confirmar o rechazar cada orden dentro de los dos días hábiles siguientes a su recepción; una orden confirmada solo podrá modificarse por acuerdo escrito de LAS PARTES.

TERCERA.- PRECIO. Los precios de LOS PRODUCTOS serán {{negocio.precios}}, más el Impuesto al Valor Agregado. Los precios serán fijos durante la vigencia del contrato y solo podrán modificarse mediante convenio por escrito firmado por LAS PARTES.

CUARTA.- FORMA DE PAGO. EL CLIENTE pagará cada factura dentro de los {{negocio.plazo_pago}} siguientes a la recepción del comprobante fiscal digital por Internet (CFDI) correspondiente a LOS PRODUCTOS entregados y recibidos, que deberá cumplir con los requisitos fiscales aplicables, mediante transferencia electrónica a la cuenta bancaria que EL PROVEEDOR designe por escrito.

QUINTA.- ENTREGA. EL PROVEEDOR entregará LOS PRODUCTOS en el almacén de EL CLIENTE indicado en cada orden de compra, dentro de los {{negocio.plazo_entrega}} siguientes a la confirmación de la orden. Los gastos de transporte, maniobras y seguro hasta el lugar de entrega serán a cargo de EL PROVEEDOR.

SEXTA.- PROPIEDAD Y RIESGO. La propiedad y el riesgo de pérdida de LOS PRODUCTOS se transmitirán a EL CLIENTE en el momento en que éste los reciba en el lugar de entrega pactado.

SÉPTIMA.- CALIDAD Y GARANTÍA. EL PROVEEDOR garantiza que LOS PRODUCTOS cumplirán con las especificaciones del Anexo A y estarán libres de defectos. EL CLIENTE contará con un plazo de {{negocio.plazo_inspeccion}} a partir de la recepción para reportar defectos aparentes, y los defectos ocultos podrán reclamarse en cuanto se conozcan. EL PROVEEDOR repondrá a su costa LOS PRODUCTOS defectuosos dentro de los cinco días hábiles siguientes al reporte o, a elección de EL CLIENTE, reembolsará su precio.

${vigenciaYRenovacion("OCTAVA")}

NOVENA.- TERMINACIÓN ANTICIPADA. EL CLIENTE podrá dar por terminado el presente contrato en cualquier momento, sin necesidad de declaración judicial y sin responsabilidad a su cargo, mediante aviso por escrito con treinta días naturales de anticipación. En tal caso, EL CLIENTE pagará únicamente LOS PRODUCTOS efectivamente entregados hasta la fecha de terminación. EL PROVEEDOR solo podrá dar por terminado anticipadamente el contrato mediante aviso por escrito con noventa días naturales de anticipación y deberá cumplir las órdenes de compra ya confirmadas.

${intereses("DÉCIMA")}

${responsabilidad("DÉCIMA PRIMERA")}

${confidencialidad("DÉCIMA SEGUNDA")}

DÉCIMA TERCERA.- PENAS CONVENCIONALES. En caso de retraso en la entrega de LOS PRODUCTOS imputable a EL PROVEEDOR, éste pagará a EL CLIENTE una pena convencional equivalente al uno por ciento del valor de la entrega de que se trate por cada día natural de retraso, sin que el total de las penas exceda del diez por ciento de dicho valor. EL CLIENTE podrá descontar las penas de los pagos pendientes, previa notificación por escrito.

${cesion("DÉCIMA CUARTA", "EL CLIENTE")}

${casoFortuito("DÉCIMA QUINTA")}

${notificaciones("DÉCIMA SEXTA")}

${modificaciones("DÉCIMA SÉPTIMA")}

${vicios("DÉCIMA OCTAVA")}

${jurisdiccionCdmx("DÉCIMA NOVENA")}

${cierre}`,
};

// ---------------------------------------------------------------------------

const compraventa: PlantillaBase = {
  tipo_contrato: "compraventa",
  nombre: "Contrato de compraventa",
  descripcion: "Para una compra de bienes muebles con entrega definida. La empresa es EL COMPRADOR.",
  roles: [
    {
      clave: "vendedor",
      termino: "EL VENDEDOR",
      etiqueta: "Vendedor",
      propia: false,
      declaraciones: ["Es legítimo propietario de los bienes objeto del presente contrato, que se encuentran libres de todo gravamen, limitación de dominio o reserva de propiedad, y tiene derecho a enajenarlos."],
    },
    {
      clave: "comprador",
      termino: "EL COMPRADOR",
      etiqueta: "Comprador",
      propia: true,
      declaraciones: ["Es su voluntad adquirir dichos bienes en los términos y condiciones del presente contrato y cuenta con los recursos para pagar el precio pactado."],
    },
  ],
  campos: [
    { clave: "bienes", etiqueta: "Bienes que se compran", tipo: "largo", requerido: true, ayuda: "Descripción, cantidad, marca y modelo; el detalle puede ir en el Anexo A." },
    { clave: "precio", etiqueta: "Precio total (antes de IVA)", tipo: "importe", requerido: true },
    {
      clave: "forma_pago",
      etiqueta: "Forma de pago",
      tipo: "largo",
      predeterminado:
        "el cincuenta por ciento dentro de los diez días naturales siguientes a la firma del presente contrato y el cincuenta por ciento restante dentro de los treinta días naturales siguientes a la entrega y recepción a satisfacción de LOS BIENES",
    },
    { clave: "lugar_entrega", etiqueta: "Lugar de entrega", tipo: "texto", requerido: true },
    { clave: "fecha_entrega", etiqueta: "Fecha de entrega", tipo: "fecha", requerido: true },
    { clave: "garantia", etiqueta: "Garantía de los bienes", tipo: "entero", unidad: MESES, predeterminado: "12" },
  ],
  cuerpo: `CONTRATO DE COMPRAVENTA QUE CELEBRAN, POR UNA PARTE, {{vendedor.proemio}}, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL VENDEDOR", Y POR LA OTRA, {{comprador.proemio}}, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL COMPRADOR", Y CONJUNTAMENTE "LAS PARTES", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:

DECLARACIONES

I. Declara EL VENDEDOR, {{vendedor.comparecencia}}, que:

{{vendedor.declaraciones}}

II. Declara EL COMPRADOR, {{comprador.comparecencia}}, que:

{{comprador.declaraciones}}

${declaracionComun}

CLÁUSULAS

PRIMERA.- OBJETO. EL VENDEDOR vende a EL COMPRADOR, y éste compra, {{negocio.bienes}}, conforme a las especificaciones del Anexo A (en lo sucesivo, "LOS BIENES"), nuevos, en perfecto estado y libres de todo gravamen.

SEGUNDA.- PRECIO. El precio total de LOS BIENES es la cantidad de {{negocio.precio}}, más el Impuesto al Valor Agregado. El precio es fijo y comprende el embalaje, el transporte, las maniobras y el seguro hasta el lugar de entrega.

TERCERA.- FORMA DE PAGO. EL COMPRADOR pagará el precio de la siguiente manera: {{negocio.forma_pago}}. Cada pago se hará contra la entrega del comprobante fiscal digital por Internet (CFDI) correspondiente, que deberá cumplir con los requisitos fiscales aplicables, mediante transferencia electrónica a la cuenta bancaria que EL VENDEDOR designe por escrito.

CUARTA.- ENTREGA. EL VENDEDOR entregará LOS BIENES en {{negocio.lugar_entrega}}, a más tardar el {{negocio.fecha_entrega}}, junto con sus manuales, certificados de calidad y la documentación necesaria para su uso.

QUINTA.- TRANSMISIÓN DE LA PROPIEDAD Y DEL RIESGO. La propiedad y el riesgo de pérdida o daño de LOS BIENES se transmitirán a EL COMPRADOR en el momento en que éste los reciba a su satisfacción en el lugar de entrega pactado.

SEXTA.- INSPECCIÓN Y RECEPCIÓN. EL COMPRADOR contará con un plazo de diez días hábiles a partir de la entrega para inspeccionar LOS BIENES y, en su caso, rechazar los que no cumplan con lo pactado. EL VENDEDOR sustituirá a su costa los bienes rechazados dentro de los diez días hábiles siguientes al aviso de rechazo.

SÉPTIMA.- GARANTÍA Y SANEAMIENTO. EL VENDEDOR garantiza LOS BIENES contra defectos de fabricación y funcionamiento durante {{negocio.garantia}} contados a partir de su recepción, y se obliga a repararlos o sustituirlos a su costa dentro de los diez días hábiles siguientes al reporte. Además, EL VENDEDOR responderá del saneamiento para el caso de evicción y por los vicios ocultos de LOS BIENES.

OCTAVA.- PENAS CONVENCIONALES. En caso de retraso en la entrega de LOS BIENES imputable a EL VENDEDOR, éste pagará a EL COMPRADOR una pena convencional equivalente al uno por ciento del precio por cada día natural de retraso, sin que el total de las penas exceda del diez por ciento del precio. EL COMPRADOR podrá descontar las penas de los pagos pendientes, previa notificación por escrito.

NOVENA.- RESCISIÓN. EL COMPRADOR podrá rescindir el presente contrato, sin necesidad de declaración judicial y sin responsabilidad a su cargo, mediante aviso por escrito, si EL VENDEDOR no entrega LOS BIENES dentro de los quince días naturales siguientes a la fecha de entrega pactada o incumple cualquier otra de sus obligaciones y no lo subsana dentro de los diez días hábiles siguientes a que se le requiera por escrito. En tal caso, EL VENDEDOR devolverá las cantidades recibidas dentro de los diez días hábiles siguientes, sin perjuicio de las penas y de los daños y perjuicios que correspondan.

${responsabilidad("DÉCIMA")}

${confidencialidad("DÉCIMA PRIMERA")}

${cesion("DÉCIMA SEGUNDA", "EL COMPRADOR")}

${casoFortuito("DÉCIMA TERCERA")}

${notificaciones("DÉCIMA CUARTA")}

${modificaciones("DÉCIMA QUINTA")}

${vicios("DÉCIMA SEXTA")}

${jurisdiccionCdmx("DÉCIMA SÉPTIMA")}

${cierre}`,
};

// ---------------------------------------------------------------------------

const arrendamiento: PlantillaBase = {
  tipo_contrato: "arrendamiento",
  nombre: "Contrato de arrendamiento",
  descripcion: "Para rentar un inmueble (oficinas, bodega, local). La empresa es EL ARRENDATARIO.",
  roles: [
    {
      clave: "arrendador",
      termino: "EL ARRENDADOR",
      etiqueta: "Arrendador",
      propia: false,
      declaraciones: [
        'Es legítimo propietario del inmueble ubicado en {{negocio.inmueble}} (en lo sucesivo, "EL INMUEBLE"), según consta en {{negocio.titulo_propiedad}}, y éste se encuentra libre de gravámenes y limitaciones de dominio que impidan su arrendamiento.',
        "EL INMUEBLE cuenta con las licencias, permisos y autorizaciones necesarios para destinarse a {{negocio.uso}}, y se encuentra al corriente en el pago del impuesto predial y de los derechos por suministro de agua.",
      ],
    },
    {
      clave: "arrendatario",
      termino: "EL ARRENDATARIO",
      etiqueta: "Arrendatario",
      propia: true,
      declaraciones: ["Conoce EL INMUEBLE y es su voluntad tomarlo en arrendamiento para destinarlo a {{negocio.uso}}."],
    },
  ],
  campos: [
    { clave: "inmueble", etiqueta: "Ubicación y descripción del inmueble", tipo: "largo", requerido: true, ayuda: "Calle, número, piso, colonia, alcaldía o municipio, entidad, superficie y cajones." },
    { clave: "titulo_propiedad", etiqueta: "Documento que acredita la propiedad", tipo: "texto", requerido: true, ayuda: "Por ejemplo: la escritura pública número ..., otorgada ante ..." },
    { clave: "uso", etiqueta: "Uso del inmueble", tipo: "texto", predeterminado: "oficinas administrativas" },
    { clave: "renta", etiqueta: "Renta mensual (antes de IVA)", tipo: "importe", requerido: true },
    { clave: "deposito", etiqueta: "Depósito en garantía", tipo: "entero", unidad: ["mes de renta", "meses de renta"], predeterminado: "1" },
    fechaInicio,
    vigencia,
  ],
  cuerpo: `CONTRATO DE ARRENDAMIENTO QUE CELEBRAN, POR UNA PARTE, {{arrendador.proemio}}, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL ARRENDADOR", Y POR LA OTRA, {{arrendatario.proemio}}, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL ARRENDATARIO", Y CONJUNTAMENTE "LAS PARTES", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:

DECLARACIONES

I. Declara EL ARRENDADOR, {{arrendador.comparecencia}}, que:

{{arrendador.declaraciones}}

II. Declara EL ARRENDATARIO, {{arrendatario.comparecencia}}, que:

{{arrendatario.declaraciones}}

${declaracionComun}

CLÁUSULAS

PRIMERA.- OBJETO. EL ARRENDADOR otorga en arrendamiento a EL ARRENDATARIO el uso y goce temporal de EL INMUEBLE, y EL ARRENDATARIO se obliga a pagar la renta pactada en este contrato.

SEGUNDA.- DESTINO. EL ARRENDATARIO destinará EL INMUEBLE a {{negocio.uso}} y no podrá darle un uso distinto sin el consentimiento previo y por escrito de EL ARRENDADOR.

TERCERA.- RENTA. EL ARRENDATARIO pagará a EL ARRENDADOR una renta mensual de {{negocio.renta}}, más el Impuesto al Valor Agregado que, en su caso, corresponda, dentro de los primeros cinco días naturales de cada mes, mediante transferencia electrónica a la cuenta bancaria que EL ARRENDADOR designe por escrito y contra la entrega del comprobante fiscal digital por Internet (CFDI) correspondiente.

CUARTA.- ACTUALIZACIÓN DE LA RENTA. Al cumplirse cada año de vigencia, la renta se actualizará en un porcentaje igual a la variación del Índice Nacional de Precios al Consumidor que publica el Instituto Nacional de Estadística y Geografía en los doce meses anteriores.

QUINTA.- DEPÓSITO EN GARANTÍA. A la firma del presente contrato, EL ARRENDATARIO entrega a EL ARRENDADOR el equivalente a {{negocio.deposito}} como depósito en garantía, que no causará intereses y que EL ARRENDADOR devolverá dentro de los treinta días naturales siguientes a la desocupación y entrega de EL INMUEBLE, previa deducción, en su caso, de los adeudos que existan y que estén debidamente acreditados.

${vigenciaYRenovacion("SEXTA").replace("VIGENCIA. El presente contrato", "VIGENCIA. El presente contrato de arrendamiento")}

SÉPTIMA.- TERMINACIÓN ANTICIPADA. EL ARRENDATARIO podrá dar por terminado el presente contrato en cualquier momento, sin penalización, mediante aviso por escrito con sesenta días naturales de anticipación, pagando únicamente la renta hasta la fecha de desocupación.

OCTAVA.- ENTREGA Y CONSERVACIÓN. EL ARRENDADOR entrega EL INMUEBLE en buen estado de uso, con sus instalaciones en funcionamiento. Las reparaciones necesarias para conservar EL INMUEBLE en estado de servir para el uso convenido, incluidas las estructurales y las de instalaciones generales, serán a cargo de EL ARRENDADOR; las reparaciones menores derivadas del uso ordinario serán a cargo de EL ARRENDATARIO.

NOVENA.- MEJORAS Y ADAPTACIONES. EL ARRENDATARIO podrá realizar las adaptaciones necesarias para el uso convenido, previa autorización por escrito de EL ARRENDADOR, que no podrá negarse sin causa justificada. Al terminar el arrendamiento, EL ARRENDATARIO podrá retirar las mejoras que puedan separarse sin daño de EL INMUEBLE.

DÉCIMA.- SUBARRENDAMIENTO. EL ARRENDATARIO no podrá subarrendar ni ceder el uso de EL INMUEBLE sin el consentimiento previo y por escrito de EL ARRENDADOR, salvo a sus sociedades afiliadas, mediante simple aviso por escrito.

DÉCIMA PRIMERA.- SERVICIOS E IMPUESTOS. Serán a cargo de EL ARRENDATARIO los servicios de energía eléctrica, telefonía e Internet que contrate para EL INMUEBLE. Serán a cargo de EL ARRENDADOR el impuesto predial y las contribuciones que correspondan al propietario de EL INMUEBLE.

DÉCIMA SEGUNDA.- DEVOLUCIÓN. Al terminar el arrendamiento, EL ARRENDATARIO devolverá EL INMUEBLE en el estado en que lo recibió, salvo el deterioro derivado del uso normal y del transcurso del tiempo, y LAS PARTES firmarán un acta de entrega.

${casoFortuito("DÉCIMA TERCERA")}

${notificaciones("DÉCIMA CUARTA")}

${modificaciones("DÉCIMA QUINTA")}

${vicios("DÉCIMA SEXTA")}

DÉCIMA SÉPTIMA.- JURISDICCIÓN Y LEGISLACIÓN APLICABLE. Para la interpretación y cumplimiento del presente contrato, LAS PARTES se someten a la legislación aplicable en el lugar de ubicación de EL INMUEBLE y a la jurisdicción de los tribunales competentes de dicho lugar, renunciando expresamente a cualquier otro fuero que por razón de sus domicilios presentes o futuros pudiera corresponderles.

${cierre}`,
};

// ---------------------------------------------------------------------------

const confidencialidadConvenio: PlantillaBase = {
  tipo_contrato: "confidencialidad",
  nombre: "Convenio de confidencialidad",
  descripcion: "Para compartir información con un tercero antes o durante una relación comercial. La empresa es LA PARTE REVELADORA.",
  roles: [
    {
      clave: "reveladora",
      termino: "LA PARTE REVELADORA",
      etiqueta: "Parte reveladora",
      propia: true,
      declaraciones: ["Es titular de la información que compartirá con LA PARTE RECEPTORA o tiene derecho a revelarla."],
    },
    {
      clave: "receptora",
      termino: "LA PARTE RECEPTORA",
      etiqueta: "Parte receptora",
      propia: false,
      declaraciones: ["Tiene interés en recibir información de LA PARTE REVELADORA con la finalidad de {{negocio.proposito}}."],
    },
  ],
  campos: [
    { clave: "proposito", etiqueta: "Finalidad para la que se comparte la información", tipo: "largo", requerido: true, ayuda: "Por ejemplo: evaluar la posible contratación de servicios de logística." },
    { clave: "vigencia_anos", etiqueta: "Vigencia del convenio", tipo: "entero", unidad: ANOS, predeterminado: "2" },
    { clave: "anos_posteriores", etiqueta: "Confidencialidad posterior a la terminación", tipo: "entero", unidad: ANOS, predeterminado: "5" },
  ],
  cuerpo: `CONVENIO DE CONFIDENCIALIDAD QUE CELEBRAN, POR UNA PARTE, {{reveladora.proemio}}, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "LA PARTE REVELADORA", Y POR LA OTRA, {{receptora.proemio}}, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "LA PARTE RECEPTORA", Y CONJUNTAMENTE "LAS PARTES", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:

DECLARACIONES

I. Declara LA PARTE REVELADORA, {{reveladora.comparecencia}}, que:

{{reveladora.declaraciones}}

II. Declara LA PARTE RECEPTORA, {{receptora.comparecencia}}, que:

{{receptora.declaraciones}}

III. Declaran LAS PARTES que se reconocen mutuamente la personalidad con la que comparecen y que es su voluntad celebrar el presente convenio.

CLÁUSULAS

PRIMERA.- OBJETO. El presente convenio tiene por objeto establecer las condiciones con las que LA PARTE RECEPTORA recibirá, conservará y utilizará la Información Confidencial que LA PARTE REVELADORA le proporcione con la finalidad de {{negocio.proposito}} (en lo sucesivo, "LA FINALIDAD").

SEGUNDA.- INFORMACIÓN CONFIDENCIAL. Se considera Información Confidencial toda la información técnica, comercial, financiera, operativa, legal o de cualquier otra naturaleza, incluidos datos, planes, procesos, precios, clientes, proveedores, programas de cómputo y secretos industriales, que LA PARTE REVELADORA proporcione a LA PARTE RECEPTORA por cualquier medio, ya sea en forma escrita, verbal, electrónica o visual, antes o después de la firma de este convenio, así como las notas, análisis y documentos que LA PARTE RECEPTORA elabore a partir de ella.

TERCERA.- EXCEPCIONES. No se considerará Información Confidencial la que LA PARTE RECEPTORA demuestre por escrito que: a) es o llega a ser del dominio público sin culpa de LA PARTE RECEPTORA; b) ya conocía legítimamente antes de recibirla, sin obligación de confidencialidad; c) recibió de un tercero que tenía derecho a revelarla sin obligación de confidencialidad, o d) desarrolló de forma independiente, sin utilizar la Información Confidencial.

CUARTA.- OBLIGACIONES DE LA PARTE RECEPTORA. LA PARTE RECEPTORA se obliga a: a) utilizar la Información Confidencial únicamente para LA FINALIDAD; b) no revelarla a terceros sin el consentimiento previo y por escrito de LA PARTE REVELADORA; c) compartirla solo con sus empleados y asesores que necesiten conocerla para LA FINALIDAD, quienes deberán estar obligados a guardar confidencialidad en términos al menos equivalentes a los de este convenio, y d) protegerla con el mismo cuidado que emplea para su propia información confidencial, que en ningún caso será menor a un cuidado razonable. LA PARTE RECEPTORA responderá por el incumplimiento de sus empleados y asesores.

QUINTA.- REVELACIÓN POR MANDATO DE AUTORIDAD. Si LA PARTE RECEPTORA es requerida por autoridad competente para revelar Información Confidencial, lo notificará a LA PARTE REVELADORA de inmediato y antes de revelarla, siempre que la ley lo permita, y revelará únicamente la información estrictamente requerida.

SEXTA.- PROPIEDAD DE LA INFORMACIÓN. La Información Confidencial es y seguirá siendo propiedad de LA PARTE REVELADORA. Nada de lo previsto en este convenio otorga a LA PARTE RECEPTORA licencia o derecho alguno sobre la Información Confidencial, ni sobre las marcas, patentes, derechos de autor o secretos industriales de LA PARTE REVELADORA.

SÉPTIMA.- DEVOLUCIÓN Y DESTRUCCIÓN. A solicitud de LA PARTE REVELADORA, y en todo caso al terminar este convenio, LA PARTE RECEPTORA devolverá o destruirá la Información Confidencial y sus copias dentro de los diez días hábiles siguientes, y entregará una constancia por escrito firmada por su representante en la que lo confirme.

OCTAVA.- DATOS PERSONALES. Si la Información Confidencial incluye datos personales, LA PARTE RECEPTORA los tratará únicamente para LA FINALIDAD y conforme a la legislación aplicable en materia de protección de datos personales en posesión de los particulares, y adoptará las medidas de seguridad administrativas, técnicas y físicas necesarias para protegerlos.

NOVENA.- VIGENCIA. El presente convenio tendrá una vigencia de {{negocio.vigencia_anos}} contados a partir de su firma. Las obligaciones de confidencialidad subsistirán durante {{negocio.anos_posteriores}} posteriores a su terminación y, respecto de la información que constituya secreto industrial, mientras conserve ese carácter.

DÉCIMA.- RESPONSABILIDAD. LA PARTE RECEPTORA será responsable de los daños y perjuicios que cause a LA PARTE REVELADORA por el incumplimiento de este convenio, sin perjuicio de las acciones civiles, penales o administrativas que correspondan conforme a la legislación aplicable, incluida la relativa a la protección de secretos industriales.

DÉCIMA PRIMERA.- SIN OBLIGACIÓN DE CONTRATAR. La firma de este convenio no obliga a LAS PARTES a celebrar ningún otro contrato ni a continuar sus conversaciones.

DÉCIMA SEGUNDA.- CESIÓN. LA PARTE RECEPTORA no podrá ceder los derechos u obligaciones derivados de este convenio sin el consentimiento previo y por escrito de LA PARTE REVELADORA.

${notificaciones("DÉCIMA TERCERA")}

${modificaciones("DÉCIMA CUARTA").replace("al presente contrato", "al presente convenio").replace("Este contrato y sus anexos", "Este convenio")}

${vicios("DÉCIMA QUINTA").replace("del presente contrato", "del presente convenio")}

${jurisdiccionCdmx("DÉCIMA SEXTA").replace("del presente contrato", "del presente convenio")}

${cierre.replace("el presente contrato", "el presente convenio")}`,
};

export const PLANTILLAS_BASE: PlantillaBase[] = [servicios, compraventa, arrendamiento, confidencialidadConvenio, suministro];
