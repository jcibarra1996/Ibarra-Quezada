// Pruebas de la base contra una instancia real con las listas cargadas.
//   DATABASE_URL=... npm run db:migrate
//   DATABASE_URL=... npm run listas:sync -- --sin-rechequeo
//   DATABASE_URL=... npm run test:db
// Cada prueba corre en una transacción que se revierte: no deja datos.
// Los casos "reales" usan registros publicados en OFAC SDN, ONU y SAT 69-B;
// si una fuente los retira, la prueba correspondiente lo señalará.
import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import type pg from 'pg';
import { getPool, type DbRole } from '../lib/db/pool.ts';

type Screen = { risk: string; matches: { source: string; match_type: string; status: string | null; risk: string; score: number }[] };

async function tx<T>(role: DbRole | 'none', fn: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const db = await getPool().connect();
  try {
    await db.query('begin');
    await db.query("select set_config('app.role', $1, true), set_config('app.actor', 'prueba', true)", [role === 'none' ? '' : role]);
    return await fn(db);
  } finally {
    await db.query('rollback').catch(() => {});
    db.release();
  }
}

async function screen(name: string, rfc: string | null, kind: 'entity' | 'individual'): Promise<Screen> {
  return tx('system', async (db) => (await db.query('select public.screen_subject($1, $2, $3) as r', [name, rfc, kind])).rows[0].r);
}

async function sqlState(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
    return undefined;
  } catch (err) {
    return (err as { code?: string }).code ?? 'error';
  }
}

after(() => getPool().end());

describe('normalize_name', () => {
  const cases: [string, string][] = [
    ['Distribuidora Ferretera del Valle, S.A. de C.V.', 'DISTRIBUIDORA FERRETERA DEL VALLE'],
    ['GRUPO ÑANDÚ, S.A.P.I. DE C.V., SOFOM, E.N.R.', 'GRUPO NANDU'],
    ['Logística Integral Norte, S. de R.L. de C.V.', 'LOGISTICA INTEGRAL NORTE'],
    ['GUZMAN LOERA, Joaquin', 'GUZMAN LOERA JOAQUIN'],
    ['Servicios Contables, S.C.', 'SERVICIOS CONTABLES'],
  ];
  for (const [input, expected] of cases) {
    test(input, async () => {
      const r = await tx('system', async (db) => (await db.query('select public.normalize_name($1) as n', [input])).rows[0].n);
      assert.equal(r, expected);
    });
  }
});

describe('screen_subject: casos reales', () => {
  test('RFC idéntico en OFAC SDN -> high', async () => {
    const r = await screen('Distribuidora Imperial de Baja California SA de CV', 'DIB771110HQ1', 'entity');
    assert.equal(r.risk, 'high');
    assert.ok(r.matches.some((m) => m.source === 'OFAC_SDN' && m.match_type === 'rfc'));
  });

  test('mismo nombre con otro RFC -> medium (probable homónimo)', async () => {
    const r = await screen('Distribuidora Imperial de Baja California, S.A. de C.V.', 'XAXX010101000', 'entity');
    assert.equal(r.risk, 'medium');
  });

  test('RFC en 69-B como Definitivo -> high', async () => {
    const r = await screen('Asesores y Administradores Agrícolas, S. de R.L. de C.V.', 'AAA120730823', 'entity');
    assert.equal(r.risk, 'high');
    assert.ok(r.matches.some((m) => m.source === 'SAT_69B' && m.status === 'Definitivo'));
  });

  test('RFC en 69-B como Desvirtuado -> low, reportado como informativo', async () => {
    const r = await screen('Aquaeris Acuacultura y Arquitectura Sustentable, S.C.', 'AAA091014835', 'entity');
    assert.equal(r.risk, 'low');
    assert.ok(r.matches.some((m) => m.source === 'SAT_69B' && m.status === 'Desvirtuado'));
  });

  test('69-B solo por nombre -> medium, nunca high', async () => {
    const r = await screen('Asesores y Administradores Agricolas S de RL de CV', null, 'entity');
    assert.equal(r.risk, 'medium');
  });

  test('persona en OFAC por nombre, con acentos y orden distinto -> high', async () => {
    assert.equal((await screen('Joaquín Guzmán Loera', null, 'individual')).risk, 'high');
    assert.equal((await screen('Joaquín Archivaldo Guzmán Loera', null, 'individual')).risk, 'high');
  });

  test('persona en lista de la ONU -> high', async () => {
    const r = await screen('Eric Badege', null, 'individual');
    assert.equal(r.risk, 'high');
    assert.ok(r.matches.some((m) => m.source === 'UN_CONSOLIDATED'));
  });
});

describe('screen_subject: nombres comunes sin coincidencias', () => {
  const companies = [
    'Distribuidora Ferretera del Valle, S.A. de C.V.',
    'Logística Integral Norte, S. de R.L. de C.V.',
    'Servicios Corporativos Integrales, S.A. de C.V.',
    'Comercializadora de Alimentos del Centro, S.A. de C.V.',
    'Constructora y Edificadora del Bajío, S.A. de C.V.',
    'Transportes Unidos de Querétaro, S.A. de C.V.',
  ];
  for (const name of companies) {
    test(name, async () => assert.equal((await screen(name, null, 'entity')).risk, 'low'));
  }
  const people = ['Juan García López', 'María Fernanda Hernández Ruiz', 'José Luis Martínez Pérez', 'Ana Sofía Ramírez Torres'];
  for (const name of people) {
    test(name, async () => assert.equal((await screen(name, null, 'individual')).risk, 'low'));
  }
});

describe('RLS y bitácora', () => {
  test('sin rol declarado no se ve nada', async () => {
    const n = await tx('none', async (db) => (await db.query('select count(*)::int as n from public.watchlist_entries')).rows[0].n);
    assert.equal(n, 0);
    const state = await sqlState(tx('none', (db) => db.query("select public.create_legal_entity('X', 'XAX010101AB1')")));
    assert.equal(state, '42501');
  });

  test('admin no lee usuarios ni sesiones', async () => {
    const n = await tx('admin', async (db) => (await db.query('select count(*)::int as n from public.app_users')).rows[0].n);
    assert.equal(n, 0);
  });

  test('admin no escribe en las listas', async () => {
    const state = await sqlState(tx('admin', (db) => db.query("update public.watchlist_sources set record_count = 0 where code = 'OFAC_SDN'")));
    // UPDATE sin política de escritura no afecta filas; se valida que no cambió.
    assert.equal(state, undefined);
    const n = await tx('admin', async (db) => {
      await db.query("update public.watchlist_sources set record_count = 0 where code = 'OFAC_SDN'");
      return (await db.query("select record_count from public.watchlist_sources where code = 'OFAC_SDN'")).rows[0].record_count;
    });
    assert.ok(n > 0);
  });

  test('audit_logs no se edita ni se borra, ni siquiera como system', async () => {
    await tx('system', async (db) => {
      const e = (await db.query("select (public.create_legal_entity('Prueba Bitácora', 'PBI010101AB1')).id")).rows[0].id;
      await db.query('savepoint s');
      assert.equal(await sqlState(db.query('update public.audit_logs set description = $1 where entity_id = $2', ['x', e])), '42501');
      await db.query('rollback to savepoint s');
      assert.equal(await sqlState(db.query('delete from public.audit_logs where entity_id = $1', [e])), '42501');
    });
  });
});

describe('run_aml_screening', () => {
  test('entidad en 69-B Definitivo queda suspendida y con bitácora', async () => {
    await tx('admin', async (db) => {
      const e = (await db.query("select (public.create_legal_entity('Asesores y Administradores Agrícolas, S. de R.L. de C.V.', 'AAA120730823')).id")).rows[0].id;
      const r = (await db.query('select public.run_aml_screening($1) as r', [e])).rows[0].r;
      assert.equal(r.screening.risk_level, 'high');
      assert.equal(r.entity_status, 'suspended');
      const logs = (await db.query('select action_type, actor from public.audit_logs where entity_id = $1 order by "timestamp"', [e])).rows;
      assert.deepEqual(logs.map((l) => l.action_type), ['entity.created', 'aml.initial_check']);
      assert.equal(logs[1].actor, 'prueba');
    });
  });

  test('representante legal en OFAC eleva el riesgo de una empresa limpia', async () => {
    await tx('admin', async (db) => {
      const e = (await db.query("select (public.create_legal_entity('Transportes Unidos de Querétaro, S.A. de C.V.', 'TUQ010101AB1')).id")).rows[0].id;
      const clean = (await db.query('select public.run_aml_screening($1) as r', [e])).rows[0].r;
      assert.equal(clean.screening.risk_level, 'low');
      assert.equal(clean.entity_status, 'pending');

      await db.query("select public.add_related_party($1, 'Joaquín Guzmán Loera', 'legal_representative', null)", [e]);
      const r = (await db.query('select public.run_aml_screening($1) as r', [e])).rows[0].r;
      assert.equal(r.screening.risk_level, 'high');
      assert.equal(r.entity_status, 'suspended');
      const subjects = r.screening.raw_json_response.subjects;
      assert.equal(subjects.length, 2);
      assert.equal(subjects[1].role, 'legal_representative');
    });
  });

  test('sin listas cargadas no hay chequeo', async () => {
    await tx('system', async (db) => {
      const e = (await db.query("select (public.create_legal_entity('Prueba Sin Listas', 'PSL010101AB1')).id")).rows[0].id;
      await db.query("update public.watchlist_sources set last_synced_at = null where code = 'SAT_69B'");
      assert.equal(await sqlState(db.query('select public.run_aml_screening($1)', [e])), '55000');
    });
  });
});

describe('decide_entity', () => {
  test('motivo obligatorio y transiciones válidas', async () => {
    await tx('admin', async (db) => {
      const e = (await db.query("select (public.create_legal_entity('Prueba Decisión', 'PDE010101AB1')).id")).rows[0].id;
      await db.query('savepoint s');
      assert.equal(await sqlState(db.query("select public.decide_entity($1, 'approved', 'corto')", [e])), '23514');
      await db.query('rollback to savepoint s');
      assert.equal(await sqlState(db.query("select public.decide_entity($1, 'suspended', 'motivo suficiente aquí')", [e])), '23514');
      await db.query('rollback to savepoint s');
      await db.query("select public.decide_entity($1, 'approved', 'Expediente completo y sin coincidencias')", [e]);
      const status = (await db.query('select status from public.legal_entities where id = $1', [e])).rows[0].status;
      assert.equal(status, 'approved');
      const log = (await db.query("select description from public.audit_logs where entity_id = $1 and action_type = 'entity.decision'", [e])).rows[0];
      assert.match(log.description, /pasa de Pendiente a Aprobada\. Motivo: Expediente completo/);
    });
  });
});

describe('falsos positivos', () => {
  test('descartar una coincidencia por nombre evita que el re-chequeo vuelva a suspender', async () => {
    await tx('admin', async (db) => {
      const e = (await db.query("select (public.create_legal_entity('Transportes Unidos de Querétaro, S.A. de C.V.', 'TUQ010101AB1')).id")).rows[0].id;
      const party = (await db.query("select (public.add_related_party($1, 'Joaquín Guzmán Loera', 'legal_representative', null)).id", [e])).rows[0].id;
      const first = (await db.query('select public.run_aml_screening($1) as r', [e])).rows[0].r;
      assert.equal(first.entity_status, 'suspended');

      const subject = first.screening.raw_json_response.subjects.find((s: { party_id?: string }) => s.party_id === party);
      const hits = subject.matches.filter((m: { risk: string }) => m.risk !== 'low');
      for (const m of hits) {
        await db.query('select public.dismiss_match($1, $2, $3, $4, $5)', [e, party, m.source, m.match_key, 'Homónimo: CURP y fecha de nacimiento distintas a la ficha.']);
      }
      await db.query("select public.decide_entity($1, 'pending', 'Falso positivo documentado en la bitácora')", [e]);

      const again = (await db.query("select public.run_aml_screening($1, 'aml.periodic_check') as r", [e])).rows[0].r;
      assert.equal(again.screening.risk_level, 'low');
      assert.equal(again.entity_status, 'pending');
      const dismissed = again.screening.raw_json_response.subjects[1].matches.filter((m: { dismissed?: boolean }) => m.dismissed);
      assert.equal(dismissed.length, hits.length);

      const actions = (await db.query('select action_type from public.audit_logs where entity_id = $1', [e])).rows.map((r) => r.action_type);
      assert.ok(actions.includes('aml.match_dismissed'));
    });
  });

  test('una coincidencia por RFC no se puede descartar', async () => {
    await tx('admin', async (db) => {
      const e = (await db.query("select (public.create_legal_entity('Asesores y Administradores Agrícolas, S. de R.L. de C.V.', 'AAA120730823')).id")).rows[0].id;
      const r = (await db.query('select public.run_aml_screening($1) as r', [e])).rows[0].r;
      const m = r.screening.raw_json_response.subjects[0].matches.find((x: { match_type: string }) => x.match_type === 'rfc');
      assert.equal(
        await sqlState(db.query('select public.dismiss_match($1, $2, $3, $4, $5)', [e, 'entity', m.source, m.match_key, 'Intento de descartar un RFC idéntico'])),
        '23514',
      );
    });
  });
});
