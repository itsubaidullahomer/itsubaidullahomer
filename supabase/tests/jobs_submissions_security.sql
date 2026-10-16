-- Isolated test database only, after jobs_portal, jobs_documents and jobs_submissions.
-- All fixtures roll back. Never substitutes for an actual employer confirmation.
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into public.jobs_owners(user_id) values ('11111111-1111-4111-8111-111111111111');
insert into public.jobs_profile(user_id,payload,revision) values ('11111111-1111-4111-8111-111111111111','{"preferences":{"approvalRequired":false},"evidence":[{"id":"react","statement":"I shipped a React product","source":"https://example.com/portfolio","level":"proficient","verified":false}]}',7);
insert into public.jobs(user_id,id,source_url,status,fit,priority,payload) values
('11111111-1111-4111-8111-111111111111','strong','https://example.com/strong','shortlisted','strong','high','{"id":"strong","status":"shortlisted","fit":"strong","appliedAt":null,"eligibility":"confirmed","eligibilityEvidence":"Pakistan explicitly accepted","requirements":[{"id":"react","essential":true,"assessment":"met","explanation":"Shipped product","evidenceIds":["react"]}]}'),
('11111111-1111-4111-8111-111111111111','unknown','https://example.com/unknown','discovered','unknown','medium','{"id":"unknown","status":"discovered","fit":"unknown","appliedAt":null,"eligibility":"unknown","requirements":[]}');
insert into storage.objects(bucket_id,name) values
('job-documents','11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333/strong.pdf'),
('job-documents','11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444/unknown.pdf');
insert into public.jobs_documents(id,user_id,job_id,kind,title,filename,path,mime,size,sha256) values
('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','strong','tailored_resume','Strong role','strong.pdf','11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333/strong.pdf','application/pdf',100,repeat('a',64)),
('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','unknown','tailored_resume','Unknown role','unknown.pdf','11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444/unknown.pdf','application/pdf',100,repeat('b',64));
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare receipt jsonb := jsonb_build_object('id','55555555-5555-4555-8555-555555555555','jobId','strong','documentId','33333333-3333-4333-8333-333333333333','channel','employer_form','destination','https://example.com/apply','submittedAt',(now()-interval '1 hour')::text,'confirmation','Employer confirmation TEST','receiptUrl','','actor','agent'); result jsonb; original_date text;
begin
  result := public.jobs_record_submission(receipt);
  if result->'receipt'->>'resume_sha256' <> repeat('a',64) then raise exception 'Exact resume hash not copied'; end if;
  if result->'receipt'->>'resume_filename' <> 'strong.pdf' then raise exception 'Exact filename missing'; end if;
  if (select payload->'evidence'->0->>'verified' from public.jobs_profile) <> 'false' then raise exception 'Candidate claim relabeled as independently verified'; end if;
  if result->'workspace'->>'revision' <> '8' then raise exception 'Receipt did not increment revision atomically'; end if;
  if (select status from public.jobs where id='strong') <> 'applied' then raise exception 'Job not marked applied'; end if;
  if (select payload->>'actor' from public.jobs_activities where id='submission:55555555-5555-4555-8555-555555555555') <> 'agent' then raise exception 'Agent receipt mislabeled'; end if;
  original_date := (select payload->>'appliedAt' from public.jobs where id='strong');
  result := public.jobs_record_submission(receipt);
  if result->'workspace'->>'revision' <> '8' or (select count(*) from public.jobs_submissions) <> 1 or (select count(*) from public.jobs_activities) <> 1 then raise exception 'Retry duplicated receipt, activity or revision'; end if;
  begin perform public.jobs_record_submission(receipt || '{"confirmation":"Different action"}'); raise exception 'Conflicting idempotency key accepted'; exception when unique_violation then null; end;
  begin perform public.jobs_record_submission(receipt || '{"id":"66666666-6666-4666-8666-666666666666","documentId":"44444444-4444-4444-8444-444444444444"}'); raise exception 'Resume for different job accepted'; exception when check_violation then null; end;
  begin perform public.jobs_record_submission(receipt || '{"id":"66666666-6666-4666-8666-666666666666","jobId":"unknown","documentId":"44444444-4444-4444-8444-444444444444"}'); raise exception 'Unverified agent application accepted'; exception when check_violation then null; end;
  begin
    update public.jobs_profile set payload=jsonb_set(payload,'{evidence,0,statement}','" "');
    perform public.jobs_record_submission(receipt || '{"id":"66666666-6666-4666-8666-666666666666"}'); raise exception 'Blank evidence statement accepted';
  exception when check_violation then null; end;
  begin
    update public.jobs_profile set payload=jsonb_set(payload,'{evidence,0,source}','" "');
    perform public.jobs_record_submission(receipt || '{"id":"66666666-6666-4666-8666-666666666666"}'); raise exception 'Blank evidence source accepted';
  exception when check_violation then null; end;
  begin
    update public.jobs_profile set payload=jsonb_set(payload,'{evidence,0,level}','"invented"');
    perform public.jobs_record_submission(receipt || '{"id":"66666666-6666-4666-8666-666666666666"}'); raise exception 'Invalid skill level accepted';
  exception when check_violation then null; end;
  begin perform public.jobs_record_submission(receipt || jsonb_build_object('id','66666666-6666-4666-8666-666666666666','submittedAt',(now()+interval '1 day')::text)); raise exception 'Future completed application accepted'; exception when check_violation then null; end;
  if (public.jobs_load_workspace()->>'revision') <> '8' then raise exception 'Failed receipt advanced revision'; end if;
  result := public.jobs_record_submission(receipt || '{"id":"66666666-6666-4666-8666-666666666666","jobId":"unknown","documentId":"44444444-4444-4444-8444-444444444444","actor":"you"}');
  if result->'workspace'->>'revision' <> '9' then raise exception 'Manual historical receipt rejected'; end if;
  update public.jobs set status='interview',payload=payload || '{"status":"interview"}' where id='strong';
  result := public.jobs_record_submission(receipt || '{"id":"77777777-7777-4777-8777-777777777777"}');
  if (select status from public.jobs where id='strong') <> 'interview' or (select payload->>'appliedAt' from public.jobs where id='strong') <> original_date then raise exception 'Receipt regressed stage or original application date'; end if;
  begin update public.jobs_submissions set confirmation='Rewritten'; raise exception 'Receipt is mutable'; exception when insufficient_privilege then null; end;
  begin delete from public.jobs_submissions; raise exception 'Receipt can be deleted'; exception when insufficient_privilege then null; end;
  begin perform public.jobs_save_workspace(result->'workspace',9); raise exception 'Concurrent stale workspace accepted'; exception when serialization_failure then null; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
  if exists(select 1 from public.jobs_submissions) then raise exception 'Non-owner read receipts'; end if;
  begin perform public.jobs_record_submission('{}'); raise exception 'Non-owner created receipt'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.jobs_owners set enabled=false where user_id='11111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
  if exists(select 1 from public.jobs_submissions) then raise exception 'Disabled owner read receipts'; end if;
  begin perform public.jobs_record_submission('{}'); raise exception 'Disabled owner created receipt'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform count(*) from public.jobs_submissions; raise exception 'Anonymous read receipts'; exception when insufficient_privilege then null; end;
  begin perform public.jobs_record_submission('{}'); raise exception 'Anonymous receipt RPC'; exception when insufficient_privilege then null; end;
end $$;
rollback;
