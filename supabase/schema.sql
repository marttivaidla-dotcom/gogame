-- =====================================================================
-- Wingspan & Wyrmspan skooride andmebaas (Supabase / PostgreSQL)
-- Käivita kogu fail Supabase'i SQL Editoris (New query → Run).
-- Skripti võib turvaliselt mitu korda käivitada.
--
-- Kõik objektid luuakse eraldi skeemi "lauamangud", et need ei läheks
-- segamini sama projekti teiste rakenduste tabelitega (skeem "public").
-- PÄRAST KÄIVITAMIST: Project Settings → Data API → Exposed schemas →
-- lisa "lauamangud" → Save.
-- =====================================================================

create schema if not exists lauamangud;
grant usage on schema lauamangud to anon, authenticated, service_role;

-- ---------- Mängijad ----------
create table if not exists lauamangud.players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 50),
  color       text not null default '#059669',
  created_at  timestamptz not null default now()
);

-- Nimi on unikaalne (tõstutundetult): "Mari" ja "mari" ei saa korraga olla
create unique index if not exists players_name_unique on lauamangud.players (lower(name));

-- ---------- Mängud (üks rida = üks mängusessioon) ----------
create table if not exists lauamangud.games (
  id          uuid primary key default gen_random_uuid(),
  game_type   text not null check (game_type in ('wingspan', 'wyrmspan')),
  played_at   date not null default current_date,
  expansions  text[] not null default '{}',
  notes       text,
  created_at  timestamptz not null default now()
);

alter table lauamangud.games add column if not exists expansions text[] not null default '{}';

create index if not exists games_type_date_idx on lauamangud.games (game_type, played_at desc);

-- ---------- Mängija tulemus ühes mängus ----------
-- breakdown hoiab punkte kategooriate kaupa, nt
--   {"birds": 42, "eggs": 12, "bonus_cards": 7, ...}
-- Kategooriad on defineeritud rakenduses (src/lib/scoring.js),
-- seega uue laienduse kategooria lisamine ei nõua skeemi muutmist.
create table if not exists lauamangud.game_scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references lauamangud.games (id) on delete cascade,
  player_id   uuid not null references lauamangud.players (id) on delete restrict,
  breakdown   jsonb not null default '{}'::jsonb,
  total       integer not null,
  placement   integer not null default 1,
  unique (game_id, player_id)
);

create index if not exists game_scores_player_idx on lauamangud.game_scores (player_id);

-- ---------- Mängu salvestamine ühe tehinguna ----------
-- Rakendus kutsub välja supabase.rpc('create_game', ...).
-- Kogusumma ja kohad arvutatakse serveris, et need oleksid alati õiged.
-- p_scores formaat: [{"player_id": "uuid", "breakdown": {"birds": 40, ...}}, ...]
drop function if exists lauamangud.create_game(text, date, text, jsonb);
drop function if exists lauamangud.create_game(text, date, text, text[], jsonb);

create function lauamangud.create_game(
  p_game_type text,
  p_played_at date,
  p_notes     text,
  p_expansions text[],
  p_scores    jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_game_id uuid;
begin
  if p_scores is null or jsonb_typeof(p_scores) <> 'array' or jsonb_array_length(p_scores) = 0 then
    raise exception 'Mängus peab olema vähemalt üks mängija';
  end if;

  insert into lauamangud.games (game_type, played_at, notes, expansions)
  values (p_game_type, coalesce(p_played_at, current_date), nullif(btrim(p_notes), ''), coalesce(p_expansions, '{}'))
  returning id into v_game_id;

  insert into lauamangud.game_scores (game_id, player_id, breakdown, total)
  select
    v_game_id,
    (s ->> 'player_id')::uuid,
    coalesce(s -> 'breakdown', '{}'::jsonb),
    coalesce((select sum(value::numeric)::int from jsonb_each_text(s -> 'breakdown')), 0)
  from jsonb_array_elements(p_scores) as s;

  -- Kohad: võrdse summa korral jagatakse koht (1, 1, 3 ...)
  update lauamangud.game_scores gs
     set placement = r.rnk
    from (
      select id, rank() over (order by total desc) as rnk
        from lauamangud.game_scores
       where game_id = v_game_id
    ) r
   where gs.id = r.id;

  return v_game_id;
end;
$$;

-- ---------- Statistika vaade ----------
create or replace view lauamangud.player_stats
with (security_invoker = true) as
select
  p.id                                         as player_id,
  p.name,
  p.color,
  g.game_type,
  count(*)                                     as games_played,
  count(*) filter (where gs.placement = 1)     as wins,
  round(avg(gs.total), 1)                      as avg_score,
  max(gs.total)                                as best_score,
  min(gs.total)                                as worst_score
from lauamangud.game_scores gs
join lauamangud.players p on p.id = gs.player_id
join lauamangud.games   g on g.id = gs.game_id
group by p.id, p.name, p.color, g.game_type;

-- ---------- Row Level Security ----------
-- Rakendusel pole sisselogimist: kõik, kellel on rakenduse link, saavad
-- andmeid lugeda ja lisada. See sobib sõpruskonnale. Kui soovid kaitset,
-- lisa Supabase Auth ja asenda "to anon" poliitikad "to authenticated" omadega.
alter table lauamangud.players     enable row level security;
alter table lauamangud.games       enable row level security;
alter table lauamangud.game_scores enable row level security;

drop policy if exists "players_all"     on lauamangud.players;
drop policy if exists "games_all"       on lauamangud.games;
drop policy if exists "game_scores_all" on lauamangud.game_scores;

create policy "players_all"     on lauamangud.players     for all to anon, authenticated using (true) with check (true);
create policy "games_all"       on lauamangud.games       for all to anon, authenticated using (true) with check (true);
create policy "game_scores_all" on lauamangud.game_scores for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on lauamangud.players, lauamangud.games, lauamangud.game_scores to anon, authenticated;
grant select on lauamangud.player_stats to anon, authenticated;
grant execute on function lauamangud.create_game(text, date, text, text[], jsonb) to anon, authenticated;
grant all on all tables in schema lauamangud to service_role;
