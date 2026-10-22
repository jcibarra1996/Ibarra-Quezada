import { claveDenominacion } from "./campos";

interface Candidato {
  id: string;
  denominacion: string;
  es_propia: boolean;
}

// Identifica los expedientes de las partes de un contrato a partir del proemio y de la
// contraparte registrada. Solo vincula coincidencias exactas de denominación (sin acentos,
// puntuación ni tipo societario); lo demás lo decide una persona.
export function identificarPartes(p: { proemio: string; contraparte: string; expedientes: Candidato[] }): {
  propiaId: string | null;
  contraparteId: string | null;
} {
  const proemio = ` ${claveDenominacion(p.proemio)} `;
  const aparece = (c: Candidato) => {
    const clave = claveDenominacion(c.denominacion);
    return clave.length >= 3 && proemio.includes(` ${clave} `);
  };
  const propias = p.expedientes.filter((e) => e.es_propia);
  const propia = propias.find(aparece) ?? (propias.length === 1 ? propias[0] : null);

  const terceros = p.expedientes.filter((e) => !e.es_propia);
  const claveContraparte = claveDenominacion(p.contraparte);
  const contraparte =
    (claveContraparte ? terceros.find((e) => claveDenominacion(e.denominacion) === claveContraparte) : undefined) ??
    (terceros.filter(aparece).length === 1 ? terceros.find(aparece) : undefined) ??
    null;
  return { propiaId: propia?.id ?? null, contraparteId: contraparte?.id ?? null };
}
