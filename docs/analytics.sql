-- Liftoff analytics: queries to paste into the Supabase SQL Editor (save each
-- one as a snippet). Traffic itself (visitors, referrers, countries, devices)
-- is in the Vercel dashboard under Analytics; these cover what players do.
--
-- Sources: guesses (one row per player per stage of today's launch; replays
-- are not recorded) and events (one row per player per launch per event,
-- since 2026-11-03). Launch N plays on 2026-10-24 + (N - 1) days, Eastern.
-- Rows with a band were scored the old way (a confidence band, 0 for a
-- miss), so fuel is only compared on rows where band is null.


-- 1. The daily funnel: opened → played a stage → finished → shared.
--    "opened" starts on 2026-11-03, when events began; before that only
--    played and finished are known.
with
  opened as (
    select launch, count(*) as n from public.events
    where name = 'launch_opened' group by launch
  ),
  played as (
    select launch, count(distinct player_id) as n from public.guesses
    group by launch
  ),
  finished as (
    select launch, count(*) as n from (
      select launch, player_id from public.guesses
      group by launch, player_id having count(*) = 5
    ) as runs
    group by launch
  ),
  shared as (
    select launch, count(*) as n from public.events
    where name = 'result_shared' group by launch
  ),
  launches as (
    select launch from played union select launch from opened
  )
select
  l.launch,
  date '2026-10-24' + (l.launch - 1) as day,
  coalesce(o.n, 0) as opened,
  coalesce(p.n, 0) as played,
  coalesce(f.n, 0) as finished,
  coalesce(s.n, 0) as shared,
  round(100.0 * coalesce(f.n, 0) / nullif(p.n, 0), 1) as finish_pct,
  round(100.0 * coalesce(s.n, 0) / nullif(f.n, 0), 1) as share_pct
from launches l
left join opened o using (launch)
left join played p using (launch)
left join finished f using (launch)
left join shared s using (launch)
order by l.launch desc;


-- 2. New and returning players each day: a player is new on the first
--    launch they played.
with
  firsts as (
    select player_id, min(launch) as first_launch from public.guesses
    group by player_id
  ),
  daily as (
    select distinct player_id, launch from public.guesses
  )
select
  d.launch,
  date '2026-10-24' + (d.launch - 1) as day,
  count(*) as players,
  count(*) filter (where d.launch = f.first_launch) as new_players,
  count(*) filter (where d.launch > f.first_launch) as returning_players
from daily d
join firsts f using (player_id)
group by d.launch
order by d.launch desc;


-- 3. Retention by first launch: of the players who started on a launch,
--    the share who played the next day, and any day in the week after.
with
  firsts as (
    select player_id, min(launch) as first_launch from public.guesses
    group by player_id
  ),
  daily as (
    select distinct player_id, launch from public.guesses
  )
select
  f.first_launch,
  date '2026-10-24' + (f.first_launch - 1) as day,
  count(*) as cohort,
  round(100.0 * count(*) filter (where exists (
    select 1 from daily d
    where d.player_id = f.player_id and d.launch = f.first_launch + 1
  )) / count(*), 1) as next_day_pct,
  round(100.0 * count(*) filter (where exists (
    select 1 from daily d
    where d.player_id = f.player_id
      and d.launch between f.first_launch + 1 and f.first_launch + 7
  )) / count(*), 1) as within_week_pct
from firsts f
group by f.first_launch
order by f.first_launch desc;


-- 4. The hardest questions under the current scoring: lowest average fuel
--    first, with how many got within 10% and how far off the typical guess
--    was (2.0 means the median guess was off by a factor of 2).
select
  launch,
  stage,
  question_id,
  count(*) as players,
  round(avg(points)) as avg_fuel,
  round(100.0 * avg((exact or log_error <= ln(1.1))::int), 1) as within_10_pct,
  round(100.0 * avg(exact::int), 1) as exact_pct,
  round(exp(percentile_cont(0.5) within group (order by log_error))::numeric, 2)
    as median_miss_factor
from public.guesses
where band is null
group by launch, stage, question_id
having count(*) >= 5
order by avg_fuel asc
limit 25;


-- 5. Average score per launch under the current scoring, out of 6,250.
select
  launch,
  date '2026-10-24' + (launch - 1) as day,
  count(*) as finished_runs,
  round(avg(total)) as avg_fuel,
  percentile_cont(0.5) within group (order by total) as median_fuel,
  max(total) as best_fuel
from (
  select launch, player_id, sum(points) as total
  from public.guesses
  where band is null
  group by launch, player_id
  having count(*) = 5
) as runs
group by launch
order by launch desc;


-- 6. Tools and the archive: of the players who opened each launch, the share
--    who used the calculator or the scratch pad, and how many replays of
--    that launch were opened and finished from the archive.
select
  launch,
  date '2026-10-24' + (launch - 1) as day,
  count(distinct player_id) filter (where name = 'launch_opened') as opened,
  round(100.0 * count(*) filter (where name = 'calculator_used')
    / nullif(count(*) filter (where name = 'launch_opened'), 0), 1)
    as calculator_pct,
  round(100.0 * count(*) filter (where name = 'notes_used')
    / nullif(count(*) filter (where name = 'launch_opened'), 0), 1)
    as notes_pct,
  count(*) filter (where name = 'replay_opened') as replays_opened,
  count(*) filter (where name = 'replay_finished') as replays_finished
from public.events
group by launch
order by launch desc;


-- 7. Totals at a glance.
select
  (select count(*) from public.players) as players_ever,
  (select count(distinct player_id) from public.guesses) as players_who_played,
  (select count(*) from (
     select 1 from public.guesses group by launch, player_id having count(*) = 5
   ) as runs) as launches_finished,
  (select count(*) from public.events where name = 'result_shared') as shares;
