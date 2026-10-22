// Playbook de ejemplo para la demostración. Está redactado desde la posición de
// la empresa contratante (LA EMPRESA) y no cita artículos de ley a propósito:
// es un punto de partida que la dirección legal debe revisar y ajustar antes de usarlo.

export interface PosicionSemilla {
  tema: string;
  preferida: string;
  respaldo: string;
  nunca_se_acepta: string;
  clausula_modelo: string;
}

const intereses: PosicionSemilla = {
  tema: "Intereses moratorios",
  preferida: "No pactar intereses moratorios. Si la contraparte los exige, deben ser recíprocos para ambas partes.",
  respaldo:
    "Intereses moratorios recíprocos a una tasa máxima de 1.5% mensual sobre saldos insolutos, que se generen solo después de un periodo de gracia de 15 días naturales contados a partir del requerimiento de pago por escrito.",
  nunca_se_acepta:
    "Intereses moratorios a cargo exclusivo de LA EMPRESA; tasas superiores a 2% mensual; capitalización de intereses; intereses sin requerimiento previo.",
  clausula_modelo:
    "INTERESES MORATORIOS. En caso de que alguna de LAS PARTES no cubra en la fecha de su vencimiento cualquier cantidad líquida y exigible a su cargo, la otra parte le requerirá el pago por escrito. Si el adeudo no se cubre dentro de los quince días naturales siguientes a dicho requerimiento, la parte morosa pagará intereses moratorios a razón del uno punto cinco por ciento mensual sobre el saldo insoluto, calculados por los días efectivamente transcurridos hasta la fecha de pago. Los intereses no se capitalizarán.",
};

const renovacion: PosicionSemilla = {
  tema: "Renovación automática",
  preferida: "Sin renovación automática. La renovación requiere convenio por escrito firmado por ambas partes.",
  respaldo:
    "Renovación automática por periodos iguales solo si LA EMPRESA puede evitarla con un aviso de no renovación de máximo 30 días naturales, y puede terminar el contrato renovado sin penalización.",
  nunca_se_acepta:
    "Plazo de aviso de no renovación mayor a 60 días naturales; renovaciones por plazos mayores al original; renovación con incremento de precio automático no pactado.",
  clausula_modelo:
    "VIGENCIA Y RENOVACIÓN. El presente contrato tendrá la vigencia señalada en la carátula. Al término de dicha vigencia, el contrato podrá renovarse por un periodo igual mediante convenio por escrito firmado por LAS PARTES. Cualquiera de ellas podrá manifestar su intención de no renovarlo mediante aviso por escrito con al menos treinta días naturales de anticipación a la fecha de vencimiento.",
};

const terminacion: PosicionSemilla = {
  tema: "Terminación anticipada",
  preferida:
    "LA EMPRESA puede terminar el contrato en cualquier momento, sin causa y sin penalización, con aviso de 30 días naturales, pagando únicamente lo efectivamente entregado o prestado.",
  respaldo: "Aviso de hasta 60 días naturales para LA EMPRESA, sin pena, con pago de lo entregado o prestado hasta la fecha de terminación.",
  nunca_se_acepta:
    "Penas por terminación anticipada a cargo de LA EMPRESA; derecho de la contraparte a terminar sin causa con aviso menor a 90 días naturales cuando se trate de un suministro o servicio crítico.",
  clausula_modelo:
    "TERMINACIÓN ANTICIPADA. LA EMPRESA podrá dar por terminado el presente contrato en cualquier momento, sin necesidad de declaración judicial y sin responsabilidad a su cargo, mediante aviso por escrito con treinta días naturales de anticipación. En tal caso, LA EMPRESA pagará únicamente los bienes efectivamente entregados o los servicios efectivamente prestados hasta la fecha de terminación. La contraparte solo podrá dar por terminado anticipadamente el contrato mediante aviso por escrito con noventa días naturales de anticipación.",
};

const jurisdiccion: PosicionSemilla = {
  tema: "Jurisdicción",
  preferida: "Leyes federales de los Estados Unidos Mexicanos y tribunales competentes de la Ciudad de México.",
  respaldo: "Etapa previa de negociación directa de 30 días naturales y, en su caso, tribunales competentes de la Ciudad de México.",
  nunca_se_acepta: "Tribunales de otra ciudad o del extranjero; legislación extranjera.",
  clausula_modelo:
    "JURISDICCIÓN Y LEGISLACIÓN APLICABLE. Para la interpretación y cumplimiento del presente contrato, LAS PARTES se someten a las leyes federales de los Estados Unidos Mexicanos y a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando expresamente a cualquier otro fuero que por razón de sus domicilios presentes o futuros pudiera corresponderles.",
};

const responsabilidad: PosicionSemilla = {
  tema: "Limitación de responsabilidad",
  preferida:
    "La contraparte responde por los daños y perjuicios que cause. Si hay tope, no aplica a dolo, mala fe, negligencia grave, confidencialidad, propiedad intelectual ni obligaciones laborales.",
  respaldo: "Tope de responsabilidad recíproco equivalente al 100% de las contraprestaciones pagadas o pagaderas en los 12 meses anteriores, con las mismas exclusiones.",
  nunca_se_acepta:
    "Tope inferior a lo pagado en 12 meses; exclusión total de responsabilidad de la contraparte; responsabilidad ilimitada a cargo de LA EMPRESA mientras la de la contraparte está limitada.",
  clausula_modelo:
    "RESPONSABILIDAD. Cada una de LAS PARTES será responsable de los daños y perjuicios que cause a la otra por el incumplimiento de sus obligaciones. La responsabilidad total de cada parte no excederá del monto total de las contraprestaciones pagadas o pagaderas en los doce meses anteriores al hecho que la origine. Este límite no será aplicable en casos de dolo, mala fe o negligencia grave, ni respecto de las obligaciones de confidencialidad, propiedad intelectual y laborales previstas en este contrato.",
};

const confidencialidad: PosicionSemilla = {
  tema: "Confidencialidad",
  preferida: "Obligación recíproca durante la vigencia y cinco años posteriores a la terminación.",
  respaldo: "Obligación recíproca durante la vigencia y tres años posteriores.",
  nunca_se_acepta: "Confidencialidad a cargo exclusivo de LA EMPRESA; plazos posteriores a la terminación menores a dos años.",
  clausula_modelo:
    "CONFIDENCIALIDAD. Cada una de LAS PARTES mantendrá en estricta confidencialidad la información técnica, comercial, financiera y operativa que reciba de la otra con motivo del presente contrato, y la utilizará únicamente para su cumplimiento. Esta obligación subsistirá durante la vigencia del contrato y durante cinco años posteriores a su terminación, y no aplicará a la información que sea del dominio público sin culpa de la parte receptora o que deba revelarse por mandato de autoridad competente.",
};

const propiedad: PosicionSemilla = {
  tema: "Propiedad intelectual",
  preferida: "Los entregables, reportes y materiales elaborados para LA EMPRESA son propiedad de LA EMPRESA desde su creación.",
  respaldo:
    "La contraparte conserva sus herramientas y conocimientos preexistentes, y otorga a LA EMPRESA una licencia perpetua, gratuita y no exclusiva para usar los entregables.",
  nunca_se_acepta: "Que la contraparte sea titular de los entregables pagados por LA EMPRESA con licencia limitada a la vigencia; cesión de propiedad intelectual de LA EMPRESA a la contraparte.",
  clausula_modelo:
    "PROPIEDAD INTELECTUAL. Los entregables, reportes, bases de datos y demás materiales que la contraparte elabore específicamente para LA EMPRESA con motivo del presente contrato serán propiedad de LA EMPRESA. La contraparte conservará la titularidad de las herramientas, metodologías y conocimientos que tuviera antes de la firma de este contrato y otorga a LA EMPRESA una licencia perpetua, gratuita y no exclusiva para utilizarlos en la medida necesaria para aprovechar los entregables.",
};

const penas: PosicionSemilla = {
  tema: "Penas convencionales",
  preferida: "Penas a cargo de la contraparte por retraso o incumplimiento de niveles de servicio, con un tope razonable.",
  respaldo: "Penas recíprocas y proporcionales, con tope del 10% del valor del contrato o de la facturación mensual, según corresponda.",
  nunca_se_acepta: "Penas a cargo exclusivo de LA EMPRESA; penas que equivalgan a la totalidad del contrato.",
  clausula_modelo:
    "PENAS CONVENCIONALES. En caso de retraso en la entrega de los bienes o en la prestación de los servicios imputable a la contraparte, ésta pagará a LA EMPRESA una pena convencional equivalente al uno por ciento del valor de la entrega o del servicio de que se trate por cada día natural de retraso, sin que el total de las penas exceda del diez por ciento de dicho valor. LA EMPRESA podrá descontar las penas de los pagos pendientes, previa notificación por escrito.",
};

const cesion: PosicionSemilla = {
  tema: "Cesión",
  preferida: "Ninguna parte cede sin consentimiento previo y por escrito de la otra, salvo LA EMPRESA a sus sociedades afiliadas.",
  respaldo: "Prohibición recíproca de ceder sin consentimiento previo y por escrito.",
  nunca_se_acepta: "Que la contraparte pueda ceder libremente sus derechos u obligaciones mientras LA EMPRESA no puede hacerlo.",
  clausula_modelo:
    "CESIÓN. Ninguna de LAS PARTES podrá ceder o transmitir los derechos u obligaciones derivados del presente contrato sin el consentimiento previo y por escrito de la otra parte. No obstante, LA EMPRESA podrá ceder el contrato a cualquiera de sus sociedades afiliadas mediante simple aviso por escrito a la contraparte.",
};

const laboral: PosicionSemilla = {
  tema: "Responsabilidad laboral del prestador",
  preferida:
    "El prestador es el único patrón de su personal, asume todas las obligaciones laborales y de seguridad social, y mantiene en paz y a salvo a LA EMPRESA. Si los servicios califican como servicios especializados conforme a la legislación laboral, el prestador cuenta con el registro vigente correspondiente.",
  respaldo: "Obligación del prestador de entregar, a solicitud de LA EMPRESA, la documentación que acredite el cumplimiento de sus obligaciones laborales y de seguridad social.",
  nunca_se_acepta: "Que LA EMPRESA asuma obligaciones laborales respecto del personal del prestador; ausencia de obligación de sacar en paz y a salvo.",
  clausula_modelo:
    "RESPONSABILIDAD LABORAL. EL PRESTADOR será el único patrón del personal que asigne a la prestación de los servicios y será el único responsable de las obligaciones laborales, fiscales y de seguridad social respecto de dicho personal. EL PRESTADOR se obliga a sacar en paz y a salvo a LA EMPRESA de cualquier reclamación que dicho personal presente en su contra. En caso de que los servicios objeto del presente contrato califiquen como servicios especializados conforme a la legislación laboral aplicable, EL PRESTADOR declara contar con el registro vigente correspondiente ante la autoridad competente, se obliga a mantenerlo durante la vigencia del contrato y a entregar a LA EMPRESA la documentación que lo acredite cuando ésta lo solicite.",
};

export const PLAYBOOKS_EJEMPLO = [
  {
    tipo_contrato: "suministro" as const,
    nombre: "Contratos de suministro",
    posiciones: [intereses, renovacion, terminacion, jurisdiccion, responsabilidad, confidencialidad, penas, cesion],
  },
  {
    tipo_contrato: "prestacion_servicios" as const,
    nombre: "Contratos de prestación de servicios",
    posiciones: [
      intereses,
      renovacion,
      terminacion,
      jurisdiccion,
      responsabilidad,
      confidencialidad,
      propiedad,
      penas,
      cesion,
      laboral,
    ],
  },
];
