-- =============================================================================
-- Listas oficiales y motor de coincidencias
--
-- Fuentes (descarga pública, sin costo):
--   OFAC_SDN         Specially Designated Nationals, Departamento del Tesoro de EE. UU.
--   UN_CONSOLIDATED  Lista consolidada del Consejo de Seguridad de la ONU
--   SAT_69B          Listado completo de contribuyentes del artículo 69-B del CFF
--
-- La Lista de Personas Bloqueadas de la UIF no se incluye: no se encontró una
-- descarga oficial pública verificable.
--
-- Criterios de riesgo (decisiones de diseño, no umbrales normativos):
--   RFC idéntico en OFAC o ONU                         -> high
--   RFC idéntico en 69-B, situación Definitivo/Presunto -> high
--   RFC idéntico en 69-B, Desvirtuado/Sentencia fav.    -> low, se reporta como informativo
--   Nombre en OFAC/ONU, similitud >= 0.85              -> high
--   Nombre en OFAC/ONU, similitud >= 0.65              -> medium (revisión humana)
--     Si la entrada trae un RFC distinto al del sujeto, high baja a medium.
--   Personas: si todas las palabras del nombre listado (3 o más) aparecen en
--     el nombre revisado, en cualquier orden, cuenta como similitud plena
--     ("GUZMAN LOERA, Joaquin" dentro de "Joaquín Archivaldo Guzmán Loera").
--   Nombre en 69-B (Definitivo/Presunto), sim. >= 0.90 -> medium, sin RFC no es concluyente
--     Si el sujeto trae RFC y la entrada otro distinto, no se reporta.
-- =============================================================================

-- unaccent no es IMMUTABLE por defecto; este envoltorio fija el diccionario
-- para poder usarlo en columnas generadas e índices.
create function public.f_unaccent(text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select public.unaccent('public.unaccent'::regdictionary, $1);
$$;

-- Nombre comparable: mayúsculas, sin acentos ni puntuación y sin la forma
-- societaria al final ("S.A. DE C.V.", "S. DE R.L.", "INC", "LLC", ...).
create function public.normalize_name(p text)
returns text
language plpgsql
immutable
strict
parallel safe
set search_path = ''
as $$
declare
  v text;
  prev text;
begin
  v := upper(public.f_unaccent(p));
  v := regexp_replace(v, '[^A-Z0-9 ]+', ' ', 'g');
  v := ' ' || btrim(regexp_replace(v, '\s+', ' ', 'g')) || ' ';

  -- Se repite porque a veces vienen encadenadas ("S.A. DE C.V., SOFOM, E.N.R.").
  loop
    prev := v;
    v := regexp_replace(v, ' (SOFOM|SOFIPO|SOFOL)( E N R| ENR| E R| ER)? $', ' ');
    v := regexp_replace(
      v,
      ' (S A P I|SAPI|S A B|SAB|S A|SA|S DE R L|S DE RL|S R L|SRL|S C|SC|A C|AC|S A S|SAS|S EN C|S EN N C|S EN C S'
      || '|SOCIEDAD ANONIMA|SOCIEDAD CIVIL|ASOCIACION CIVIL|SOCIEDAD DE RESPONSABILIDAD LIMITADA)'
      || '( DE C V| DE CV| C V| CV)? $',
      ' '
    );
    v := regexp_replace(v, ' (INC|LLC|LTD|LIMITED|CORP|CORPORATION|CO|COMPANY|GMBH|PLC|LLP) $', ' ');
    exit when v = prev;
  end loop;

  return btrim(v);
end;
$$;

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------
create table public.watchlist_sources (
  code             text primary key check (code in ('OFAC_SDN', 'UN_CONSOLIDATED', 'SAT_69B')),
  name             text not null,
  source_url       text not null,
  list_date        text,
  record_count     integer not null default 0,
  content_sha256   text,
  last_synced_at   timestamptz
);

comment on column public.watchlist_sources.list_date is 'Fecha de actualización que declara la propia fuente, tal como viene en el archivo.';

insert into public.watchlist_sources (code, name, source_url) values
  ('OFAC_SDN', 'OFAC SDN (Tesoro de EE. UU.)', 'https://www.treasury.gov/ofac/downloads/sdn.csv'),
  ('UN_CONSOLIDATED', 'Lista consolidada del Consejo de Seguridad de la ONU', 'https://scsanctions.un.org/resources/xml/sp/consolidated.xml'),
  ('SAT_69B', 'SAT, listado del artículo 69-B del CFF', 'http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv');

create table public.watchlist_entries (
  id            bigint generated always as identity primary key,
  source_code   text not null references public.watchlist_sources (code) on delete cascade,
  external_id   text not null,
  primary_name  text not null,
  entity_kind   text not null check (entity_kind in ('individual', 'entity', 'vessel', 'aircraft', 'unknown')),
  tax_ids       text[] not null default '{}',
  status        text,
  programs      text,
  details       jsonb not null default '{}'::jsonb,
  constraint watchlist_entries_source_external_key unique (source_code, external_id)
);

comment on column public.watchlist_entries.status is 'SAT 69-B: situación del contribuyente (Definitivo, Presunto, Desvirtuado, Sentencia Favorable).';

create index watchlist_entries_tax_ids_idx on public.watchlist_entries using gin (tax_ids);

create table public.watchlist_names (
  entry_id   bigint not null references public.watchlist_entries (id) on delete cascade,
  name       text not null,
  name_norm  text generated always as (public.normalize_name(name)) stored,
  name_tokens text[] generated always as (string_to_array(public.normalize_name(name), ' ')) stored
);

create index watchlist_names_entry_idx on public.watchlist_names (entry_id);
create index watchlist_names_trgm_idx on public.watchlist_names using gin (name_norm public.gin_trgm_ops);
create index watchlist_names_tokens_idx on public.watchlist_names using gin (name_tokens);

alter table public.watchlist_sources enable row level security;
alter table public.watchlist_entries enable row level security;
alter table public.watchlist_names   enable row level security;
alter table public.watchlist_sources force row level security;
alter table public.watchlist_entries force row level security;
alter table public.watchlist_names   force row level security;

create policy read_lists on public.watchlist_sources for select using (public.app_role() in ('admin', 'system'));
create policy read_lists on public.watchlist_entries for select using (public.app_role() in ('admin', 'system'));
create policy read_lists on public.watchlist_names   for select using (public.app_role() in ('admin', 'system'));

create policy sync_lists on public.watchlist_sources for all using (public.app_role() = 'system') with check (public.app_role() = 'system');
create policy sync_lists on public.watchlist_entries for all using (public.app_role() = 'system') with check (public.app_role() = 'system');
create policy sync_lists on public.watchlist_names   for all using (public.app_role() = 'system') with check (public.app_role() = 'system');

-- -----------------------------------------------------------------------------
-- Clave estable de una entrada para recordar descartes de falsos positivos
-- entre versiones de la lista. OFAC (ent_num) y ONU (DATAID) traen un
-- identificador estable. En 69-B el número de fila cambia entre versiones,
-- así que se usa RFC (o nombre) + situación: si el SAT cambia la situación,
-- el descarte deja de aplicar y el caso se revisa de nuevo.
-- -----------------------------------------------------------------------------
create function public.watchlist_match_key(p_source text, p_external_id text, p_tax_ids text[], p_name text, p_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_source = 'SAT_69B'
      then coalesce(p_tax_ids[1], public.normalize_name(p_name)) || '|' || coalesce(p_status, '')
    else p_external_id
  end;
$$;

-- -----------------------------------------------------------------------------
-- Coincidencias de un sujeto (empresa o persona) contra las tres listas
-- p_kind: 'entity' (persona moral) o 'individual' (persona física)
-- Devuelve {"risk": "...", "matches": [...]}
-- -----------------------------------------------------------------------------
create function public.screen_subject(p_name text, p_tax_id text, p_kind text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_norm     text := public.normalize_name(p_name);
  v_tokens   text[] := string_to_array(public.normalize_name(p_name), ' ');
  v_tax      text := nullif(upper(btrim(coalesce(p_tax_id, ''))), '');
  v_kinds    text[];
  v_matches  jsonb := '[]'::jsonb;
  v_rank     int := 0;
  v_risk     text;
  r          record;
begin
  if p_kind not in ('entity', 'individual') then
    raise exception 'p_kind inválido: %', p_kind;
  end if;
  v_kinds := array[p_kind, 'unknown'];

  -- 1. RFC idéntico
  if v_tax is not null then
    for r in
      select e.*, s.name as source_name
        from public.watchlist_entries e
        join public.watchlist_sources s on s.code = e.source_code
       where e.tax_ids @> array[v_tax]
    loop
      v_risk := case
        when r.source_code = 'SAT_69B' and r.status in ('Definitivo', 'Presunto') then 'high'
        when r.source_code = 'SAT_69B' then 'low'
        else 'high'
      end;
      v_matches := v_matches || jsonb_build_object(
        'source', r.source_code,
        'source_name', r.source_name,
        'external_id', r.external_id,
        'match_key', public.watchlist_match_key(r.source_code, r.external_id, r.tax_ids, r.primary_name, r.status),
        'matched_name', r.primary_name,
        'primary_name', r.primary_name,
        'match_type', 'rfc',
        'score', 1,
        'status', r.status,
        'programs', r.programs,
        'risk', v_risk
      );
    end loop;
  end if;

  -- 2. Nombre aproximado (trigramas sobre el nombre normalizado y sus alias)
  if length(v_norm) >= 4 then
    perform set_config('pg_trgm.similarity_threshold', '0.65', true);

    for r in
      with candidates as (
        select distinct on (x.id) x.*
          from (
            select e.id, e.source_code, e.external_id, e.primary_name, e.tax_ids, e.status, e.programs,
                   n.name as matched_name,
                   case
                     when p_kind = 'individual' and cardinality(n.name_tokens) >= 3 and n.name_tokens <@ v_tokens
                       then 1.0
                     else public.similarity(n.name_norm, v_norm)
                   end as score
              from public.watchlist_names n
              join public.watchlist_entries e on e.id = n.entry_id
             where (
                     n.name_norm operator(public.%) v_norm
                     or (p_kind = 'individual' and cardinality(n.name_tokens) >= 3 and n.name_tokens <@ v_tokens)
                   )
               and e.entity_kind = any (v_kinds)
               and not (v_tax is not null and e.tax_ids @> array[v_tax])
          ) x
         order by x.id, x.score desc
      )
      select c.*, s.name as source_name
        from candidates c
        join public.watchlist_sources s on s.code = c.source_code
       order by c.score desc
       limit 25
    loop
      v_risk := null;

      if r.source_code in ('OFAC_SDN', 'UN_CONSOLIDATED') then
        if r.score >= 0.85 then v_risk := 'high';
        elsif r.score >= 0.65 then v_risk := 'medium';
        end if;
        -- La entrada trae un RFC y no es el del sujeto: probable homónimo.
        if v_risk = 'high' and v_tax is not null and cardinality(r.tax_ids) > 0 then
          v_risk := 'medium';
        end if;
      elsif r.source_code = 'SAT_69B' then
        if r.status in ('Definitivo', 'Presunto')
           and r.score >= 0.90
           and not (v_tax is not null and cardinality(r.tax_ids) > 0) then
          v_risk := 'medium';
        end if;
      end if;

      continue when v_risk is null;
      v_rank := v_rank + 1;
      exit when v_rank > 10;

      v_matches := v_matches || jsonb_build_object(
        'source', r.source_code,
        'source_name', r.source_name,
        'external_id', r.external_id,
        'match_key', public.watchlist_match_key(r.source_code, r.external_id, r.tax_ids, r.primary_name, r.status),
        'matched_name', r.matched_name,
        'primary_name', r.primary_name,
        'match_type', 'name',
        'score', round(r.score::numeric, 3),
        'status', r.status,
        'programs', r.programs,
        'risk', v_risk
      );
    end loop;
  end if;

  return jsonb_build_object(
    'risk', coalesce(
      (select case
                when bool_or(m ->> 'risk' = 'high') then 'high'
                when bool_or(m ->> 'risk' = 'medium') then 'medium'
                else 'low'
              end
         from jsonb_array_elements(v_matches) m),
      'low'),
    'matches', v_matches
  );
end;
$$;
