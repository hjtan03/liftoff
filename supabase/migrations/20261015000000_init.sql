-- Liftoff: initial schema.
--
-- Questions are not stored here. They live as JSON documents in
-- public/questions/ (one per launch), and the API loads the same file the
-- game does. The database only records what players did.
--
-- Access model: only the API (Vercel functions using the Supabase secret key,
-- which acts as service_role) reads or writes. Row Level Security is on with
-- no policies, and the public roles (anon, authenticated) get no grants.

-- Anonymous players: a UUID the client generates and keeps in localStorage.
create table public.players (
  player_id   uuid primary key,
  first_seen  timestamptz not null default now()
);

-- One submission per player per stage per launch, enforced by the primary key.
-- hit, exact and points are computed by the API from the question, never
-- taken from the client.
create table public.guesses (
  player_id    uuid not null references public.players (player_id),
  launch       integer not null check (launch >= 1),
  stage        smallint not null check (stage between 1 and 5),
  question_id  text not null,
  guess        double precision not null check (guess > 0 and guess < 1e15),
  band         text not null check (band in ('lock', 'solid', 'rough')),
  hit          boolean not null,
  exact        boolean not null,
  points       integer not null check (points >= 0),
  log_error    double precision not null check (log_error >= 0),  -- abs(ln(guess / answer)), for percentile
  assumptions  jsonb,                                              -- the player's own factor values, optional
  created_at   timestamptz not null default now(),
  primary key (player_id, launch, stage)
);

-- Crowd stats aggregate every guess for one stage of one launch.
create index guesses_by_stage on public.guesses (launch, stage);

-- Crowd stats for one stage. Pass the player's log_error to also get their
-- percentile: the share of players whose guess was further off.
create function public.crowd_stats(
  p_launch     integer,
  p_stage      smallint,
  p_log_error  double precision default null
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'players', count(*),
    'hitRate', jsonb_build_object(
      'lock',  round(avg(g.hit::int) filter (where g.band = 'lock'), 4),
      'solid', round(avg(g.hit::int) filter (where g.band = 'solid'), 4),
      'rough', round(avg(g.hit::int) filter (where g.band = 'rough'), 4)
    ),
    'lockHitShare', round(coalesce(avg((g.band = 'lock' and g.hit)::int), 0), 4),
    'percentile', case
      when p_log_error is null then null
      else round(coalesce(avg((g.log_error > p_log_error)::int), 0), 4)
    end
  )
  from public.guesses g
  where g.launch = p_launch and g.stage = p_stage;
$$;

alter table public.players enable row level security;
alter table public.guesses enable row level security;

-- The project does not expose new tables automatically, so grant the API's
-- role explicitly. Functions are executable by PUBLIC by default; revoke that.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.players, public.guesses to service_role;
revoke all on public.players, public.guesses from anon, authenticated;
revoke execute on function public.crowd_stats(integer, smallint, double precision) from public, anon, authenticated;
grant execute on function public.crowd_stats(integer, smallint, double precision) to service_role;
