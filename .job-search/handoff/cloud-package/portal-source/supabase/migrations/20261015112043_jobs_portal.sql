-- Private owner workspace. No anonymous access, no service-role client, no public signup trigger.
create table public.jobs_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.jobs_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);
create table public.jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  source_url text not null,
  status text not null check (status in ('discovered','shortlisted','drafting','needs_approval','approved','applied','interview','offer','rejected','archived')),
  fit text not null check (fit in ('strong','gaps','stretch','unknown')),
  priority text not null check (priority in ('high','medium','low')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload->>'id' = id),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, source_url)
);
create index jobs_user_status on public.jobs (user_id, status);
create index jobs_user_fit_priority on public.jobs (user_id, fit, priority);
create table public.jobs_activities (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  job_id text,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload->>'id' = id),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, job_id) references public.jobs(user_id, id)
);
create index jobs_activities_job on public.jobs_activities (user_id, job_id, created_at desc);
create table public.jobs_agent_runs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload->>'id' = id),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table public.jobs_discovery_guard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_started_at timestamptz not null
);

alter table public.jobs_owners enable row level security;
alter table public.jobs_profile enable row level security;
alter table public.jobs enable row level security;
alter table public.jobs_activities enable row level security;
alter table public.jobs_agent_runs enable row level security;
alter table public.jobs_discovery_guard enable row level security;

-- Authorization comes from this protected allowlist, never editable user metadata.
create policy jobs_owner_reads_self on public.jobs_owners for select to authenticated
  using (user_id = (select auth.uid()) and enabled);
create policy jobs_profile_owner on public.jobs_profile for all to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled));
create policy jobs_owner on public.jobs for all to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled));
create policy jobs_activities_owner on public.jobs_activities for all to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled));
create policy jobs_runs_owner on public.jobs_agent_runs for all to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled));
create policy jobs_discovery_owner on public.jobs_discovery_guard for all to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled));

revoke all on public.jobs_owners, public.jobs_profile, public.jobs, public.jobs_activities, public.jobs_agent_runs, public.jobs_discovery_guard from anon, authenticated;
grant select on public.jobs_owners to authenticated;
grant select, insert, update on public.jobs_profile, public.jobs, public.jobs_discovery_guard to authenticated;
-- Timeline and completed runs are append-only through both RPC and direct Data API.
grant select, insert on public.jobs_activities, public.jobs_agent_runs to authenticated;

create function public.jobs_load_workspace() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare actor uuid := auth.uid(); result jsonb;
begin
  if actor is null or not exists(select 1 from public.jobs_owners where user_id = actor and enabled) then raise exception 'Owner access required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'revision', coalesce((select revision from public.jobs_profile where user_id = actor), 0),
    'profile', (select payload from public.jobs_profile where user_id = actor),
    'jobs', coalesce((select jsonb_agg(payload order by updated_at desc) from public.jobs where user_id = actor), '[]'::jsonb),
    'activities', coalesce((select jsonb_agg(payload order by created_at desc) from public.jobs_activities where user_id = actor), '[]'::jsonb),
    'runs', coalesce((select jsonb_agg(payload order by created_at desc) from public.jobs_agent_runs where user_id = actor), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

-- A workspace update and its activity entries commit atomically. Optimistic revision prevents lost updates.
create function public.jobs_save_workspace(p_workspace jsonb, p_expected_revision bigint) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare actor uuid := auth.uid(); current_revision bigint; item jsonb;
begin
  if actor is null or not exists(select 1 from public.jobs_owners where user_id = actor and enabled) then raise exception 'Owner access required' using errcode = '42501'; end if;
  if jsonb_typeof(p_workspace) is distinct from 'object'
    or jsonb_typeof(p_workspace->'profile') is distinct from 'object'
    or jsonb_typeof(p_workspace->'jobs') is distinct from 'array'
    or jsonb_typeof(p_workspace->'activities') is distinct from 'array'
    or jsonb_typeof(p_workspace->'runs') is distinct from 'array'
    or octet_length(p_workspace::text) > 20000000 then raise exception 'Invalid workspace'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  select coalesce((select revision from public.jobs_profile where user_id = actor), 0) into current_revision;
  if current_revision <> p_expected_revision then raise exception 'Workspace changed' using errcode = '40001'; end if;
  for item in select value from jsonb_array_elements(p_workspace->'jobs') loop
    insert into public.jobs(user_id, id, source_url, status, fit, priority, payload)
      values(actor, item->>'id', item->>'url', item->>'status', item->>'fit', item->>'priority', item)
    on conflict(user_id, id) do update set source_url = excluded.source_url, status = excluded.status, fit = excluded.fit, priority = excluded.priority, payload = excluded.payload, updated_at = now();
  end loop;
  for item in select value from jsonb_array_elements(p_workspace->'activities') loop
    insert into public.jobs_activities(user_id, id, job_id, payload, created_at)
      values(actor, item->>'id', item->>'jobId', item, (item->>'createdAt')::timestamptz)
    on conflict(user_id, id) do nothing;
  end loop;
  for item in select value from jsonb_array_elements(p_workspace->'runs') loop
    insert into public.jobs_agent_runs(user_id, id, payload, created_at)
      values(actor, item->>'id', item, (item->>'startedAt')::timestamptz)
    on conflict(user_id, id) do nothing;
  end loop;
  insert into public.jobs_profile(user_id, payload, revision) values(actor, p_workspace->'profile', current_revision + 1)
    on conflict(user_id) do update set payload = excluded.payload, revision = excluded.revision, updated_at = now();
  return current_revision + 1;
end;
$$;

-- Persisted source quota survives deploys and serializes simultaneous refresh clicks.
create function public.jobs_claim_discovery() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare actor uuid := auth.uid(); previous_start timestamptz;
begin
  if actor is null or not exists(select 1 from public.jobs_owners where user_id = actor and enabled) then raise exception 'Owner access required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 1));
  select last_started_at into previous_start from public.jobs_discovery_guard where user_id = actor;
  if previous_start is not null and previous_start > now() - interval '6 hours' then
    return jsonb_build_object('allowed', false, 'next_at', previous_start + interval '6 hours');
  end if;
  insert into public.jobs_discovery_guard(user_id, last_started_at) values(actor, now())
    on conflict(user_id) do update set last_started_at = excluded.last_started_at;
  return jsonb_build_object('allowed', true, 'next_at', now() + interval '6 hours');
end;
$$;
revoke execute on function public.jobs_load_workspace(), public.jobs_save_workspace(jsonb,bigint), public.jobs_claim_discovery() from public, anon;
grant execute on function public.jobs_load_workspace(), public.jobs_save_workspace(jsonb,bigint), public.jobs_claim_discovery() to authenticated;
