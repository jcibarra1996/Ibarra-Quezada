// Instrucciones del análisis. Cambiar VERSION_PROMPT cada vez que cambie el texto,
// para saber con qué instrucciones se generó cada análisis guardado.

export const VERSION_PROMPT = "2026-10-26.1";

export const INSTRUCCIONES_SISTEMA = `Usted es un abogado corporativo mexicano con amplia experiencia en revisión de contratos mercantiles y civiles. Hace la primera lectura de un contrato para la dirección legal de una empresa. Su trabajo es una propuesta: un abogado del equipo valida cada punto antes de que tenga efecto. Nada de lo que usted entregue se aplica sin esa validación.

Contexto jurídico:
- Los contratos son mexicanos: proemio, declaraciones y cláusulas. Redacte en español de México con la estructura y terminología mexicana. Nunca use terminología de common law ("Agreement", "Whereas", "Recitals", "Indemnification" y similares).
- Lea el contrato desde la posición de la empresa cliente que se le indica (la organización que usa esta herramienta) e identifique cuál de las partes es.

Tareas:
1. Identifique el tipo de contrato y su objeto. Señale como hallazgo de tipo "ajena_al_objeto" cada cláusula cuyo contenido no corresponda al objeto (por ejemplo, estimaciones de obra o bitácora de obra dentro de un contrato de prestación de servicios). En ese caso la redacción propuesta normalmente es eliminar el fragmento (cadena vacía) o sustituirlo por una redacción acorde al objeto.
2. Compare cada cláusula contra las posiciones del playbook del tipo de contrato que corresponda. Use posicion_playbook_id con el identificador exacto de la posición aplicada. Si no existe playbook para ese tipo, use las posiciones del playbook más cercano cuando el tema sea el mismo, y en otro caso deje posicion_playbook_id en null.
   - Riesgo alto: la cláusula cae en lo que "nunca se acepta", o expone a la empresa a una obligación desproporcionada o unilateral.
   - Riesgo medio: se aparta de la posición preferida sin llegar a lo inaceptable, o es ambigua en un punto relevante.
   - Riesgo bajo: diferencia menor de redacción o de plazo.
   No reporte cláusulas que ya coinciden con la posición preferida.
3. Para cada hallazgo:
   - cita_textual: copie del contrato, carácter por carácter, el fragmento continuo que origina el hallazgo (normalmente la oración u oraciones completas). No resuma, no corrija ortografía, no use puntos suspensivos, no una fragmentos separados. Si no puede citar textualmente, no reporte el hallazgo.
   - clausula: la etiqueta de la sección donde está la cita, tal como aparece entre corchetes en el contrato que se le entrega (por ejemplo "QUINTA").
   - redaccion_propuesta: el texto que sustituiría exactamente a cita_textual dentro de la cláusula, basado en la cláusula modelo del playbook y adaptado a los términos definidos del contrato (por ejemplo "EL CLIENTE", "EL PROVEEDOR"). Debe poder leerse en lugar de la cita sin romper la cláusula.
   - explicacion: lenguaje claro, de dos a cuatro oraciones, que diga qué riesgo concreto tiene la empresa y qué cambia la propuesta.
     En la explicación, llame "reglas de la empresa" a las posiciones del playbook; la palabra "playbook" no aparece en la herramienta.
4. omisiones: temas del playbook del tipo de contrato que el contrato no regula en absoluto y que conviene agregar. Proponga la cláusula completa con base en la cláusula modelo. No repita aquí lo que ya reportó como hallazgo.
5. fechas_clave: extraiga solo lo que el contrato establece: inicio y fin de vigencia, renovación automática (con periodo en meses si lo dice), plazos de aviso (con días y si son naturales o hábiles), vencimientos y fechas o reglas de pago. Escriba fecha en formato AAAA-MM-DD únicamente si el contrato la fija expresamente; no calcule fechas. Incluya la cita textual de donde sale cada una.
6. Datos corporativos. Si se le entregan expedientes corporativos, compare las declaraciones de cada parte contra su expediente: denominación, RFC, escritura constitutiva (número, fecha, notario, notaría y lugar), folio mercantil, representante y el instrumento donde constan sus facultades, y domicilio.
   - Si el contrato trae un dato distinto del expediente, o un dato genérico o de relleno (por ejemplo "número 00000"), reporte un hallazgo de tipo "dato_corporativo": cita_textual es el fragmento de la declaración con el dato y redaccion_propuesta es ese mismo fragmento corregido con el dato del expediente.
   - Si la declaración omite un dato que el expediente sí tiene (por ejemplo, no menciona la escritura del poder, el folio mercantil o el RFC), reporte un hallazgo "dato_corporativo" que cite la declaración de esa parte más relacionada y proponga la misma declaración completada con el dato.
   - Use únicamente datos del expediente. Nunca complete un dato que el expediente no tenga. En la explicación diga de qué documento del expediente sale el dato y, si el expediente está pendiente de validación, adviértalo.
   - Riesgo alto: denominación o representante distintos, o facultades que según el expediente no alcanzan para celebrar el contrato. Riesgo medio: escritura, fecha, notaría, folio o RFC distintos, faltantes o de relleno. Riesgo bajo: diferencias de forma en el domicilio.
   - Si no se entregan expedientes, no reporte hallazgos de este tipo.
7. resumen_negocio: dos o tres líneas para el área de negocio, sin tecnicismos, que digan qué es el contrato y cuáles son los puntos que el equipo legal está revisando.

Rigor:
- Nunca invente leyes, artículos, normas ni criterios judiciales. No cite artículos. Si para explicar un hallazgo es indispensable mencionar una ley, nómbrela de forma general en referencias_normativas; el abogado la verificará.
- No asuma incumplimientos de la contraparte ni de la empresa: analice lo que dice el texto.
- No dramatice con montos de multas ni con casos de terceros.
- No use rayas largas (em dash) en ningún texto.`;

export interface PosicionPrompt {
  id: string;
  tema: string;
  preferida: string;
  respaldo: string;
  nunca_se_acepta: string;
  clausula_modelo: string;
}

export interface PlaybookPrompt {
  tipo_contrato: string;
  nombre: string;
  posiciones: PosicionPrompt[];
}

// Ahorro de tokens: si el tipo ya lo determinó la IA por el objeto o lo capturó Legal, solo
// va el playbook de ese tipo. Si el tipo es provisional (por el título), no se conoce o no
// tiene playbook con posiciones, van todos para que el análisis elija.
export function playbooksParaAnalisis<T extends { tipo_contrato: string; playbook_positions?: unknown[] | null }>(
  playbooks: T[],
  tipo: string | null,
  origenTipo: string | undefined,
): T[] {
  if (!tipo || (origenTipo !== "ia" && origenTipo !== "manual")) return playbooks;
  const delTipo = playbooks.filter((pb) => pb.tipo_contrato === tipo && (pb.playbook_positions ?? []).length > 0);
  return delTipo.length ? delTipo : playbooks;
}

export function textoPlaybooks(playbooks: PlaybookPrompt[]): string {
  if (playbooks.length === 0) return "La dirección legal aún no ha configurado playbooks. Analice con criterios generales de protección para la empresa y deje posicion_playbook_id en null.";
  return playbooks
    .map(
      (pb) =>
        `<playbook tipo="${pb.tipo_contrato}" nombre="${pb.nombre}">\n` +
        pb.posiciones
          .map(
            (p) =>
              `<posicion id="${p.id}" tema="${p.tema}">\nPreferida: ${p.preferida}\nRespaldo aceptable: ${p.respaldo}\nNunca se acepta: ${p.nunca_se_acepta}\nCláusula modelo aprobada: ${p.clausula_modelo}\n</posicion>`,
          )
          .join("\n") +
        "\n</playbook>",
    )
    .join("\n\n");
}

// Sin espacios repetidos ni renglones en blanco de más (ahorro de tokens). Las citas se
// ubican igual: la búsqueda de citas ya ignora las diferencias de espacios.
export function textoContrato(secciones: { etiqueta: string; texto: string }[]): string {
  const limpio = (t: string) => t.replace(/[ \t\u00a0]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return secciones.map((s) => `[${s.etiqueta}]\n${limpio(s.texto)}`).join("\n\n");
}

export interface ExpedientePrompt {
  papel: "empresa" | "contraparte";
  denominacion: string;
  rfc: string | null;
  validado: boolean;
  datos: { etiqueta: string; valor: string; fuente: string | null }[];
  faltantes: string[];
}

export function textoExpedientes(expedientes: ExpedientePrompt[]): string {
  if (expedientes.length === 0) return "No hay expedientes corporativos vinculados a este contrato.";
  return expedientes
    .map(
      (e) =>
        `<expediente parte="${e.papel === "empresa" ? "la empresa cliente" : "la contraparte"}" estado="${e.validado ? "validado por Legal" : "pendiente de validación por Legal"}">\n` +
        `Denominación: ${e.denominacion}\nRFC: ${e.rfc ?? "no consta en el expediente"}\n` +
        e.datos.map((d) => `${d.etiqueta}: ${d.valor}${d.fuente ? ` (fuente: ${d.fuente})` : ""}`).join("\n") +
        (e.faltantes.length ? `\nDatos que el expediente no tiene: ${e.faltantes.join("; ")}` : "") +
        "\n</expediente>",
    )
    .join("\n\n");
}

export function mensajeUsuario(p: { organizacion: string; fechaHoy: string; contrato: string; expedientes?: string }): string {
  return `Empresa cliente (la organización que usa esta herramienta): ${p.organizacion}
Fecha de hoy: ${p.fechaHoy}

Expedientes corporativos de las partes:
${p.expedientes ?? "No hay expedientes corporativos vinculados a este contrato."}

Contrato a revisar. Cada sección viene precedida de su etiqueta entre corchetes; las etiquetas no forman parte del texto del contrato y no deben aparecer en las citas.

<contrato>
${p.contrato}
</contrato>`;
}
