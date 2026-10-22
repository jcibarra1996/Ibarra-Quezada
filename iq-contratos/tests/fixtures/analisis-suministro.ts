// Respuesta de ejemplo del modelo para el contrato de suministro de la semilla.
// Solo para pruebas: las citas están copiadas del contrato, salvo la del hallazgo
// marcado como "cita inventada", que debe descartarse por no existir en el texto.
// Los identificadores de posición se sustituyen en cada prueba por los reales.

export const analisisSuministro = (pos: Record<string, string>) => ({
  clasificacion: {
    tipo_contrato: "suministro",
    objeto: "Suministro periódico de empaques de cartón corrugado y materiales de embalaje mediante órdenes de compra.",
    cita_objeto:
      "EL PROVEEDOR se obliga a suministrar a EL CLIENTE, de manera periódica, los empaques de cartón corrugado y materiales de embalaje descritos en el Anexo A",
    contraparte: "PROVEEDOR XYZ, S.A. DE C.V.",
  },
  resumen_negocio:
    "Contrato de suministro de empaques con PROVEEDOR XYZ por un año, con renovación automática. Legal está revisando intereses moratorios solo a cargo de la empresa, el aviso de 90 días para no renovar y que los juicios serían en Monterrey.",
  hallazgos: [
    {
      clausula: "TERCERA",
      cita_textual:
        "EL PROVEEDOR podrá actualizar dicha lista en cualquier momento mediante simple aviso por correo electrónico a EL CLIENTE, y los nuevos precios serán aplicables a las órdenes de compra emitidas a partir de la fecha del aviso.",
      tema: "Precio",
      posicion_playbook_id: null,
      tipo: "desviacion_playbook",
      nivel_riesgo: "medio",
      explicacion:
        "El proveedor puede cambiar precios en cualquier momento con un simple correo. La empresa pierde certeza de costos durante la vigencia. La propuesta fija los precios por la vigencia y exige acuerdo por escrito para modificarlos.",
      redaccion_propuesta:
        "Los precios se mantendrán fijos durante la vigencia del contrato y solo podrán modificarse mediante convenio por escrito firmado por LAS PARTES.",
      referencias_normativas: [],
    },
    {
      clausula: "CUARTA",
      cita_textual: "EL CLIENTE pagará cada factura dentro de los quince días naturales siguientes a la fecha de su recepción",
      tema: "Forma de pago (cita inventada)",
      posicion_playbook_id: null,
      tipo: "desviacion_playbook",
      nivel_riesgo: "bajo",
      explicacion: "Este hallazgo tiene una cita que no existe en el contrato y debe descartarse.",
      redaccion_propuesta: "",
      referencias_normativas: [],
    },
    {
      clausula: "QUINTA",
      cita_textual:
        "En caso de que EL CLIENTE no cubra cualquier cantidad en la fecha de su vencimiento, pagará a EL PROVEEDOR intereses moratorios a razón del tres por ciento mensual sobre el saldo insoluto, desde la fecha de vencimiento y hasta la fecha de pago total, sin necesidad de requerimiento previo. Los intereses no pagados se capitalizarán mensualmente.",
      tema: "Intereses moratorios",
      posicion_playbook_id: pos["Intereses moratorios"],
      tipo: "desviacion_playbook",
      nivel_riesgo: "alto",
      explicacion:
        "Los intereses moratorios solo corren a cargo de la empresa, a una tasa de 3% mensual, sin requerimiento previo y con capitalización. El playbook no acepta ninguno de esos tres elementos. La propuesta los vuelve recíprocos, baja la tasa, exige requerimiento con periodo de gracia y elimina la capitalización.",
      redaccion_propuesta:
        "En caso de que alguna de LAS PARTES no cubra en la fecha de su vencimiento cualquier cantidad líquida y exigible a su cargo, la otra parte le requerirá el pago por escrito. Si el adeudo no se cubre dentro de los quince días naturales siguientes a dicho requerimiento, la parte morosa pagará intereses moratorios a razón del uno punto cinco por ciento mensual sobre el saldo insoluto, calculados por los días efectivamente transcurridos hasta la fecha de pago. Los intereses no se capitalizarán.",
      referencias_normativas: [],
    },
    {
      clausula: "SÉPTIMA",
      cita_textual:
        "EL CLIENTE contará con un plazo de tres días naturales a partir de la entrega para reportar defectos; transcurrido dicho plazo, LOS PRODUCTOS se tendrán por aceptados sin reserva.",
      tema: "Calidad y garantía",
      posicion_playbook_id: null,
      tipo: "desviacion_playbook",
      nivel_riesgo: "medio",
      explicacion:
        "Tres días naturales es poco para revisar entregas de volumen, y los defectos ocultos quedarían aceptados. La propuesta amplía el plazo y deja a salvo los defectos que no se puedan detectar en una revisión ordinaria.",
      redaccion_propuesta:
        "EL CLIENTE contará con un plazo de quince días naturales a partir de la entrega para reportar defectos aparentes. Los defectos ocultos podrán reclamarse dentro de los noventa días naturales siguientes a la entrega.",
      referencias_normativas: [],
    },
    {
      clausula: "OCTAVA",
      cita_textual:
        "Al término de dicho plazo, el contrato se renovará automáticamente por periodos sucesivos de un año, salvo que alguna de LAS PARTES notifique por escrito a la otra su voluntad de no renovarlo con al menos noventa días naturales de anticipación a la fecha de vencimiento del periodo que corresponda.",
      tema: "Renovación automática",
      posicion_playbook_id: pos["Renovación automática"],
      tipo: "desviacion_playbook",
      nivel_riesgo: "alto",
      explicacion:
        "La renovación es automática y el aviso para evitarla es de 90 días naturales, por encima del máximo de 60 que acepta el playbook. Si nadie da aviso a tiempo, la empresa queda obligada un año más. La propuesta sustituye la renovación automática por una renovación mediante convenio y reduce el aviso a 30 días.",
      redaccion_propuesta:
        "Al término de dicho plazo, el contrato podrá renovarse por un periodo igual mediante convenio por escrito firmado por LAS PARTES. Cualquiera de ellas podrá manifestar su intención de no renovarlo mediante aviso por escrito con al menos treinta días naturales de anticipación a la fecha de vencimiento.",
      referencias_normativas: [],
    },
    {
      clausula: "NOVENA",
      cita_textual:
        "EL PROVEEDOR podrá dar por terminado el presente contrato en cualquier momento, sin responsabilidad, mediante aviso por escrito con quince días naturales de anticipación. En caso de que EL CLIENTE desee dar por terminado anticipadamente el contrato, deberá pagar a EL PROVEEDOR una pena equivalente al cincuenta por ciento del valor de las compras estimadas para el resto de la vigencia.",
      tema: "Terminación anticipada",
      posicion_playbook_id: pos["Terminación anticipada"],
      tipo: "desviacion_playbook",
      nivel_riesgo: "alto",
      explicacion:
        "El proveedor puede salir con 15 días de aviso, lo que pone en riesgo el abasto, mientras que la empresa pagaría una pena del 50% de las compras estimadas si termina antes. La propuesta invierte el equilibrio conforme al playbook.",
      redaccion_propuesta:
        "EL CLIENTE podrá dar por terminado el presente contrato en cualquier momento, sin necesidad de declaración judicial y sin responsabilidad a su cargo, mediante aviso por escrito con treinta días naturales de anticipación, pagando únicamente LOS PRODUCTOS efectivamente entregados hasta la fecha de terminación. EL PROVEEDOR solo podrá dar por terminado anticipadamente el contrato mediante aviso por escrito con noventa días naturales de anticipación.",
      referencias_normativas: [],
    },
    {
      clausula: "DÉCIMA",
      cita_textual:
        "La responsabilidad total de EL PROVEEDOR derivada del presente contrato, cualquiera que sea su causa, no excederá del monto pagado por EL CLIENTE en el mes inmediato anterior al evento que la origine.",
      tema: "Limitación de responsabilidad",
      posicion_playbook_id: pos["Limitación de responsabilidad"],
      tipo: "desviacion_playbook",
      nivel_riesgo: "alto",
      explicacion:
        "El tope equivale a un solo mes de compras y aplica sin excepciones, incluso ante dolo. El playbook no acepta topes inferiores a lo pagado en doce meses. La propuesta hace el tope recíproco, lo lleva a doce meses y excluye dolo, mala fe y confidencialidad.",
      redaccion_propuesta:
        "La responsabilidad total de cada una de LAS PARTES no excederá del monto total pagado o pagadero conforme a este contrato en los doce meses anteriores al hecho que la origine. Este límite no será aplicable en casos de dolo, mala fe o negligencia grave, ni respecto de las obligaciones de confidencialidad.",
      referencias_normativas: [],
    },
    {
      clausula: "DÉCIMA PRIMERA",
      cita_textual:
        "EL CLIENTE se obliga a mantener en estricta confidencialidad la información comercial, técnica y de precios que reciba de EL PROVEEDOR, durante la vigencia del contrato y cinco años posteriores a su terminación.",
      tema: "Confidencialidad",
      posicion_playbook_id: pos["Confidencialidad"],
      tipo: "desviacion_playbook",
      nivel_riesgo: "alto",
      explicacion:
        "La obligación de confidencialidad es solo para la empresa; el proveedor no queda obligado a cuidar la información de la empresa. La propuesta la vuelve recíproca.",
      redaccion_propuesta:
        "Cada una de LAS PARTES mantendrá en estricta confidencialidad la información técnica, comercial, financiera y operativa que reciba de la otra con motivo del presente contrato, y la utilizará únicamente para su cumplimiento, durante la vigencia del contrato y cinco años posteriores a su terminación.",
      referencias_normativas: [],
    },
    {
      clausula: "DÉCIMA SEGUNDA",
      cita_textual: "EL PROVEEDOR podrá ceder libremente sus derechos de cobro y sus obligaciones a cualquier tercero.",
      tema: "Cesión",
      posicion_playbook_id: pos["Cesión"],
      tipo: "desviacion_playbook",
      nivel_riesgo: "alto",
      explicacion:
        "El proveedor puede ceder el contrato a cualquier tercero sin consentimiento, mientras que la empresa no puede hacerlo. La propuesta hace la restricción recíproca.",
      redaccion_propuesta:
        "EL PROVEEDOR tampoco podrá ceder los derechos u obligaciones derivados del presente contrato sin el consentimiento previo y por escrito de EL CLIENTE.",
      referencias_normativas: [],
    },
    {
      clausula: "DÉCIMA QUINTA",
      cita_textual: "a la jurisdicción de los tribunales competentes de la ciudad de Monterrey, Nuevo León",
      tema: "Jurisdicción",
      posicion_playbook_id: pos["Jurisdicción"],
      tipo: "desviacion_playbook",
      nivel_riesgo: "alto",
      explicacion:
        "Cualquier controversia tendría que litigarse en Monterrey, fuera del domicilio de la empresa. El playbook exige tribunales de la Ciudad de México.",
      redaccion_propuesta: "a la jurisdicción de los tribunales competentes de la Ciudad de México",
      referencias_normativas: [],
    },
  ],
  omisiones: [
    {
      tema: "Penas convencionales",
      posicion_playbook_id: pos["Penas convencionales"],
      nivel_riesgo: "medio",
      explicacion: "El contrato no prevé consecuencias por retrasos en las entregas del proveedor. Conviene pactar una pena con tope.",
      clausula_propuesta:
        "PENAS CONVENCIONALES. En caso de retraso en la entrega de LOS PRODUCTOS imputable a EL PROVEEDOR, éste pagará a EL CLIENTE una pena convencional equivalente al uno por ciento del valor de la entrega de que se trate por cada día natural de retraso, sin que el total de las penas exceda del diez por ciento de dicho valor. EL CLIENTE podrá descontar las penas de los pagos pendientes, previa notificación por escrito.",
    },
  ],
  fechas_clave: [
    {
      tipo: "inicio_vigencia",
      descripcion: "Inicio de la vigencia.",
      fecha: "2026-02-01",
      regla: null,
      dias_aviso: null,
      dias_aviso_tipo: null,
      periodo_renovacion_meses: null,
      clausula: "OCTAVA",
      cita_textual: "El presente contrato tendrá una vigencia de un año contado a partir del 1 de febrero de 2026",
    },
    {
      tipo: "fin_vigencia",
      descripcion: "Fin de la vigencia inicial.",
      fecha: "2027-01-31",
      regla: null,
      dias_aviso: null,
      dias_aviso_tipo: null,
      periodo_renovacion_meses: null,
      clausula: "OCTAVA",
      cita_textual: "y concluirá el 31 de enero de 2027",
    },
    {
      tipo: "renovacion_automatica",
      descripcion: "Renovación automática por periodos de un año salvo aviso de no renovación.",
      fecha: null,
      regla: "Renovación automática por periodos sucesivos de un año; aviso de no renovación con al menos 90 días naturales de anticipación.",
      dias_aviso: 90,
      dias_aviso_tipo: "naturales",
      periodo_renovacion_meses: 12,
      clausula: "OCTAVA",
      cita_textual: "el contrato se renovará automáticamente por periodos sucesivos de un año",
    },
    {
      tipo: "pago",
      descripcion: "Pago de cada factura.",
      fecha: null,
      regla: "Dentro de los 30 días naturales siguientes a la recepción de la factura.",
      dias_aviso: null,
      dias_aviso_tipo: null,
      periodo_renovacion_meses: null,
      clausula: "CUARTA",
      cita_textual: "EL CLIENTE pagará cada factura dentro de los treinta días naturales siguientes a la fecha de su recepción",
    },
  ],
});
