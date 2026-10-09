// Parsers de las listas oficiales. Convierten cada archivo al mismo formato
// de entrada para watchlist_entries / watchlist_names.
// Standalone (sin alias "@/"): lo usa scripts/sync-listas.ts.
import { parse as parseCsv } from 'csv-parse/sync';
import { XMLParser } from 'fast-xml-parser';

export type EntityKind = 'individual' | 'entity' | 'vessel' | 'aircraft' | 'unknown';

export interface WatchlistRecord {
  external_id: string;
  primary_name: string;
  entity_kind: EntityKind;
  tax_ids: string[];
  status: string | null;
  programs: string | null;
  details: Record<string, unknown>;
  /** Nombre principal más alias, sin duplicados. */
  names: string[];
}

export interface ParsedList {
  records: WatchlistRecord[];
  /** Fecha de actualización declarada por la fuente, tal como viene. */
  listDate: string | null;
}

const RFC_RE = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;

export function normalizeRfc(raw: string): string | null {
  const v = raw.toUpperCase().replace(/[\s-]/g, '');
  return RFC_RE.test(v) ? v : null;
}

function uniq(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v?.replace(/\s+/g, ' ').trim();
    if (t && !seen.has(t.toUpperCase())) {
      seen.add(t.toUpperCase());
      out.push(t);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// OFAC SDN (sdn.csv + alt.csv). Formato documentado por OFAC: sin encabezado,
// "-0-" significa vacío.
//   sdn.csv: ent_num, SDN_Name, SDN_Type, Program, Title, Call_Sign,
//            Vess_type, Tonnage, GRT, Vess_flag, Vess_owner, Remarks
//   alt.csv: ent_num, alt_num, alt_type, alt_name, alt_remarks
// ---------------------------------------------------------------------------

function ofacValue(v: string | undefined): string | null {
  const t = (v ?? '').trim();
  return t === '' || t === '-0-' ? null : t;
}

function readOfacCsv(text: string): string[][] {
  return parseCsv(text.replace(/\x1a/g, ''), {
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];
}

export function parseOfacSdn(sdnCsv: string, altCsv: string, listDate: string | null): ParsedList {
  const aliases = new Map<string, string[]>();
  for (const row of readOfacCsv(altCsv)) {
    const ent = ofacValue(row[0]);
    const name = ofacValue(row[3]);
    if (!ent || !name) continue;
    const list = aliases.get(ent) ?? [];
    list.push(name);
    aliases.set(ent, list);
  }

  const records: WatchlistRecord[] = [];
  for (const row of readOfacCsv(sdnCsv)) {
    const ent = ofacValue(row[0]);
    const name = ofacValue(row[1]);
    if (!ent || !name || !/^\d+$/.test(ent)) continue;

    const type = ofacValue(row[2])?.toLowerCase();
    const kind: EntityKind =
      type === 'individual' ? 'individual' : type === 'vessel' ? 'vessel' : type === 'aircraft' ? 'aircraft' : 'entity';
    const remarks = ofacValue(row[11]);

    // OFAC anota el RFC de personas y empresas mexicanas como "R.F.C. ABC-123456-XY1".
    const taxIds = uniq(
      [...(remarks ?? '').matchAll(/R\.F\.C\.\s*([A-Z0-9&Ñ-]+)/g)].map((m) => normalizeRfc(m[1] ?? '')),
    );

    records.push({
      external_id: ent,
      primary_name: name,
      entity_kind: kind,
      tax_ids: taxIds,
      status: null,
      programs: ofacValue(row[3]),
      details: { title: ofacValue(row[4]), remarks },
      names: uniq([name, ...(aliases.get(ent) ?? [])]),
    });
  }
  return { records, listDate };
}

// ---------------------------------------------------------------------------
// ONU, lista consolidada del Consejo de Seguridad (consolidated.xml)
// ---------------------------------------------------------------------------

type XmlNode = Record<string, unknown>;

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function text(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'object') return null;
  const t = String(v).replace(/\s+/g, ' ').trim();
  return t === '' ? null : t;
}

export function parseUnConsolidated(xml: string): ParsedList {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false, trimValues: true });
  const doc = parser.parse(xml) as XmlNode;
  const root = doc.CONSOLIDATED_LIST as XmlNode | undefined;
  if (!root) throw new Error('XML de la ONU sin CONSOLIDATED_LIST');

  const records: WatchlistRecord[] = [];

  const individuals = asArray((root.INDIVIDUALS as XmlNode | undefined)?.INDIVIDUAL as XmlNode | XmlNode[]);
  for (const ind of individuals) {
    const id = text(ind.DATAID);
    const primary = [ind.FIRST_NAME, ind.SECOND_NAME, ind.THIRD_NAME, ind.FOURTH_NAME].map(text).filter(Boolean).join(' ');
    if (!id || !primary) continue;
    const aliasNames = asArray(ind.INDIVIDUAL_ALIAS as XmlNode | XmlNode[]).map((a) => text(a.ALIAS_NAME));
    records.push({
      external_id: id,
      primary_name: primary,
      entity_kind: 'individual',
      tax_ids: [],
      status: null,
      programs: text(ind.UN_LIST_TYPE),
      details: { reference_number: text(ind.REFERENCE_NUMBER), listed_on: text(ind.LISTED_ON) },
      names: uniq([primary, text(ind.NAME_ORIGINAL_SCRIPT), ...aliasNames]),
    });
  }

  const entities = asArray((root.ENTITIES as XmlNode | undefined)?.ENTITY as XmlNode | XmlNode[]);
  for (const ent of entities) {
    const id = text(ent.DATAID);
    const primary = text(ent.FIRST_NAME);
    if (!id || !primary) continue;
    const aliasNames = asArray(ent.ENTITY_ALIAS as XmlNode | XmlNode[]).map((a) => text(a.ALIAS_NAME));
    records.push({
      external_id: id,
      primary_name: primary,
      entity_kind: 'entity',
      tax_ids: [],
      status: null,
      programs: text(ent.UN_LIST_TYPE),
      details: { reference_number: text(ent.REFERENCE_NUMBER), listed_on: text(ent.LISTED_ON) },
      names: uniq([primary, ...aliasNames]),
    });
  }

  const generated = root['@_dateGenerated'];
  return { records, listDate: typeof generated === 'string' ? generated : null };
}

// ---------------------------------------------------------------------------
// SAT, listado completo del artículo 69-B del CFF
// Fila 1: leyenda con "Información actualizada al ...". Fila 2: título.
// Fila 3: encabezados (No, RFC, Nombre del Contribuyente, Situación del
// contribuyente, ...). El archivo viene en Windows-1252.
// ---------------------------------------------------------------------------

const SAT_STATUSES = new Set(['Definitivo', 'Presunto', 'Desvirtuado', 'Sentencia Favorable']);

export function parseSat69b(buffer: Uint8Array): ParsedList {
  const content = new TextDecoder('windows-1252').decode(buffer);
  const rows = parseCsv(content, { relax_column_count: true, skip_empty_lines: true, trim: true }) as string[][];

  const headerIdx = rows.findIndex((r) => r[1] === 'RFC' && /Situaci/.test(r[3] ?? ''));
  if (headerIdx < 0) throw new Error('Formato 69-B no reconocido: no se encontró el encabezado RFC / Situación');

  const legend = rows.slice(0, headerIdx).map((r) => r[0] ?? '').join(' ');
  const listDate = /actualizada al ([^;.]+)/i.exec(legend)?.[1]?.trim() ?? null;

  const records: WatchlistRecord[] = [];
  for (const row of rows.slice(headerIdx + 1)) {
    const no = row[0]?.trim();
    const rawRfc = row[1]?.trim() ?? '';
    const name = row[2]?.trim();
    const status = row[3]?.trim() ?? '';
    if (!no || !name) continue;
    if (!SAT_STATUSES.has(status)) {
      throw new Error(`Situación 69-B desconocida en la fila ${no}: "${status}"`);
    }
    const rfc = normalizeRfc(rawRfc);
    records.push({
      external_id: no,
      primary_name: name,
      entity_kind: rfc?.length === 12 ? 'entity' : rfc?.length === 13 ? 'individual' : 'unknown',
      tax_ids: rfc ? [rfc] : [],
      status,
      programs: null,
      details: {
        rfc_publicado: rawRfc,
        oficio_presuncion_sat: row[4] || null,
        publicacion_dof_presuntos: row[7] || null,
        oficio_definitivos_sat: row[12] || null,
        publicacion_dof_definitivos: row[15] || null,
      },
      names: [name],
    });
  }
  return { records, listDate };
}
