-- Run only against an isolated development/test database after applying the migration.
-- All fixtures and writes roll back. Raises on any regression.
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
insert into public.jobs_owners(user_id) values ('11111111-1111-4111-8111-111111111111');
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
  if exists(select 1 from public.jobs_owners) then raise exception 'Non-owner can read allowlist'; end if;
  begin perform public.jobs_load_workspace(); raise exception 'Non-owner RPC access allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.jobs_owners(user_id) values(auth.uid()); raise exception 'Self-enrollment allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$ declare result jsonb; revision bigint; begin
  result := public.jobs_load_workspace();
  if result->>'revision' <> '0' then raise exception 'Unexpected initial revision'; end if;
  revision := public.jobs_save_workspace('{"profile":{"name":"Owner"},"jobs":[{"id":"test-job","url":"https://example.com/job","status":"discovered","fit":"unknown","priority":"high"}],"activities":[{"id":"test-activity","jobId":"test-job","createdAt":"2026-10-15T00:00:00Z","body":"Test"}],"runs":[]}'::jsonb, 0);
  if revision <> 1 then raise exception 'Save failed'; end if;
  begin perform public.jobs_save_workspace('{"profile":{},"jobs":[],"activities":[],"runs":[]}'::jsonb, 0); raise exception 'Stale revision accepted'; exception when serialization_failure then null; end;
  begin perform public.jobs_save_workspace('{"profile":{},"jobs":[],"activities":[{"id":"orphan","jobId":"missing","createdAt":"2026-10-15T00:00:00Z"}],"runs":[]}'::jsonb, 1); raise exception 'Orphan audit accepted'; exception when foreign_key_violation then null; end;
  if (public.jobs_load_workspace()->>'revision') <> '1' then raise exception 'Failed transaction advanced revision'; end if;
  begin update public.jobs_activities set payload = '{}'::jsonb; raise exception 'Audit history mutable'; exception when insufficient_privilege then null; end;
  begin update public.jobs set user_id = '22222222-2222-4222-8222-222222222222'; raise exception 'Ownership reassigned'; exception when insufficient_privilege then null; end;
  result := public.jobs_claim_discovery(); if result->>'allowed' <> 'true' then raise exception 'First discovery denied'; end if;
  result := public.jobs_claim_discovery(); if result->>'allowed' <> 'false' then raise exception 'Discovery cooldown bypassed'; end if;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
  if exists(select 1 from public.jobs) or exists(select 1 from public.jobs_profile) or exists(select 1 from public.jobs_activities) or exists(select 1 from public.jobs_agent_runs) then raise exception 'Non-owner can read workspace data'; end if;
  begin insert into public.jobs_profile(user_id,payload) values(auth.uid(),'{}'); raise exception 'Non-owner can create workspace'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.jobs_owners set enabled = false where user_id = '11111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$ begin
  if exists(select 1 from public.jobs) then raise exception 'Disabled owner still sees rows'; end if;
  begin perform public.jobs_load_workspace(); raise exception 'Disabled owner RPC access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform public.jobs_load_workspace(); raise exception 'Anonymous RPC access'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.jobs; raise exception 'Anonymous table access'; exception when insufficient_privilege then null; end;
end $$;
rollback;
