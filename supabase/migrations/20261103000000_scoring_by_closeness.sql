-- Liftoff: score by closeness instead of a confidence band.
--
-- The game no longer asks for a band or for the player's own factor values,
-- so both columns become optional; rows from before keep theirs. The crowd
-- stat that compared bands is replaced by closeShare: of everyone on a stage,
-- the share who got it exactly or within 10% (log error at most ln 1.1).
-- crowd_stats keeps its signature, so its grants carry over.

alter table public.guesses alter column band drop not null;

create or replace function public.crowd_stats(
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
    'closeShare', round(coalesce(avg((g.exact or g.log_error <= ln(1.1))::int), 0), 4),
    'percentile', case
      when p_log_error is null then null
      else round(coalesce(avg((g.log_error > p_log_error)::int), 0), 4)
    end
  )
  from public.guesses g
  where g.launch = p_launch and g.stage = p_stage;
$$;
