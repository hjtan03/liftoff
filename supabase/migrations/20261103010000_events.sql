-- Liftoff: analytics events.
--
-- What the game reports beyond guesses: launches opened and finished,
-- archive replays, shares, and whether the calculator and scratch pad get
-- used. One row per player per launch per event, so a refresh or a second
-- share never counts twice. Nothing personal: the player is the same
-- anonymous UUID the guesses use. The queries that read this are in
-- docs/analytics.sql.

create table public.events (
  player_id   uuid not null references public.players (player_id),
  launch      integer not null check (launch >= 1),
  name        text not null check (name in (
                'launch_opened', 'replay_opened', 'launch_finished',
                'replay_finished', 'result_shared', 'calculator_used',
                'notes_used'
              )),
  created_at  timestamptz not null default now(),
  primary key (player_id, launch, name)
);

create index events_by_launch on public.events (launch, name);

-- Same access model as the other tables: only the API's role.
alter table public.events enable row level security;
grant select, insert, update, delete on public.events to service_role;
revoke all on public.events from anon, authenticated;
