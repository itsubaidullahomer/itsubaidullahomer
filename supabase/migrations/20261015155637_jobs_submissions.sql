-- External application receipts are immutable and bind the exact tailored PDF.
-- Apply after jobs_documents. Nothing here sends email or submits employer forms.
create table public.jobs_submissions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null,
  document_id uuid not null references public.jobs_documents(id),
  channel text not null check (channel in ('employer_form','email')),
  destination text not null check (length(destination) between 3 and 2048),
  submitted_at timestamptz not null,
  confirmation text not null check (length(btrim(confirmation)) between 1 and 4000),
  receipt_url text not null default '' check (length(receipt_url) <= 2048 and (receipt_url = '' or receipt_url ~ '^https://[^[:space:]@]+\.[^[:space:]@]+')),
  actor text not null check (actor in ('you','agent')),
  resume_sha256 text not null check (resume_sha256 ~ '^[a-f0-9]{64}$'),
  resume_filename text not null,
  recorded_at timestamptz not null default now(),
  foreign key (user_id, job_id) references public.jobs(user_id,id),
  check ((channel = 'email' and length(destination) <= 254 and destination ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$') or
         (channel = 'employer_form' and destination ~ '^https://[^[:space:]@]+\.[^[:space:]@]+'))
);
create index jobs_submissions_owner_created on public.jobs_submissions(user_id,submitted_at desc,id desc);
create index jobs_submissions_job on public.jobs_submissions(user_id,job_id,submitted_at desc,id desc);
create index jobs_submissions_document on public.jobs_submissions(document_id);
alter table public.jobs_submissions enable row level security;
revoke all on public.jobs_submissions from anon,authenticated;
grant select,insert on public.jobs_submissions to authenticated;
create policy jobs_submissions_owner_read on public.jobs_submissions for select to authenticated
  using (user_id = (select auth.uid()) and exists(select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled));
create policy jobs_submissions_owner_append on public.jobs_submissions for insert to authenticated
  with check (user_id = (select auth.uid()) and exists(select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled));

create function public.jobs_validate_submission() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare document public.jobs_documents%rowtype; opportunity public.jobs%rowtype; profile jsonb;
begin
  if new.user_id is distinct from auth.uid() or not exists(select 1 from public.jobs_owners where user_id = auth.uid() and enabled) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  -- Shares the lock with jobs_save_workspace, so a concurrent save retries its revision.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
  select * into document from public.jobs_documents where id = new.document_id and user_id = new.user_id;
  if not found or document.job_id is distinct from new.job_id or document.kind <> 'tailored_resume' or document.mime <> 'application/pdf' then
    raise exception 'Exact tailored resume required' using errcode = '23514';
  end if;
  select * into opportunity from public.jobs where user_id = new.user_id and id = new.job_id;
  if not found then raise exception 'Opportunity not found' using errcode = '23503'; end if;
  select payload into profile from public.jobs_profile where user_id = new.user_id;
  if not found then raise exception 'Save the candidate profile first' using errcode = '23514'; end if;
  if new.submitted_at > now() + interval '5 minutes' or not isfinite(new.submitted_at) then
    raise exception 'Submission time must describe a completed action' using errcode = '23514';
  end if;
  if new.actor = 'agent' then
    if opportunity.fit <> 'strong' or opportunity.payload->>'eligibility' is distinct from 'confirmed'
      or length(btrim(coalesce(opportunity.payload->>'eligibilityEvidence',''))) = 0
      or not exists(select 1 from jsonb_array_elements(opportunity.payload->'requirements') r where r->>'essential' = 'true')
      or exists(select 1 from jsonb_array_elements(opportunity.payload->'requirements') r where
        r->>'assessment' = 'gap' or (r->>'essential' = 'true' and (
          r->>'assessment' is distinct from 'met' or length(btrim(coalesce(r->>'explanation',''))) = 0 or
          jsonb_array_length(coalesce(r->'evidenceIds','[]'::jsonb)) = 0 or
          exists(select 1 from jsonb_array_elements_text(r->'evidenceIds') evidence_id where not exists(
            select 1 from jsonb_array_elements(profile->'evidence') evidence where evidence->>'id' = evidence_id
              and length(btrim(coalesce(evidence->>'statement',''))) > 0
              and length(btrim(coalesce(evidence->>'source',''))) > 0
              and evidence->>'level' in ('working','proficient','advanced','unverified')
          ))
        )))
      or (coalesce(profile->'preferences'->>'approvalRequired','true') <> 'false' and opportunity.status <> 'approved') then
      raise exception 'Agent submission requires evidence-backed strong fit, eligibility and authorization' using errcode = '23514';
    end if;
  end if;
  new.resume_sha256 := document.sha256;
  new.resume_filename := document.filename;
  new.recorded_at := now();
  return new;
end;
$$;
create trigger jobs_submission_validate before insert on public.jobs_submissions for each row execute function public.jobs_validate_submission();

create function public.jobs_apply_submission() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare opportunity public.jobs%rowtype; next_status text; audit_id text := 'submission:' || new.id::text;
begin
  select * into strict opportunity from public.jobs where user_id = new.user_id and id = new.job_id;
  next_status := case when opportunity.status in ('interview','offer','rejected','archived') then opportunity.status else 'applied' end;
  update public.jobs set status = next_status, updated_at = now(), payload = payload || jsonb_build_object(
    'status',next_status,'appliedAt',coalesce(payload->>'appliedAt',new.submitted_at::text),'updatedAt',new.recorded_at
  ) where user_id = new.user_id and id = new.job_id;
  insert into public.jobs_activities(user_id,id,job_id,payload,created_at) values(new.user_id,audit_id,new.job_id,
    jsonb_build_object('id',audit_id,'jobId',new.job_id,'type','status','actor',new.actor,'createdAt',new.recorded_at,
      'title',case when new.actor = 'agent' then 'Agent submission receipt saved' else 'Your submission receipt saved' end,
      'body',format('Submitted %s via %s to %s. Confirmation: %s. Exact resume: %s (SHA-256 %s). Receipt ID: %s.',
        new.submitted_at,new.channel,new.destination,new.confirmation,new.resume_filename,new.resume_sha256,new.id)),new.recorded_at);
  update public.jobs_profile set revision = revision + 1,updated_at = now() where user_id = new.user_id;
  return new;
end;
$$;
create trigger jobs_submission_apply after insert on public.jobs_submissions for each row execute function public.jobs_apply_submission();

-- The caller supplies a stable UUID per external application, preserved on retries.
create function public.jobs_record_submission(p_receipt jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); saved public.jobs_submissions%rowtype;
begin
  if owner_id is null or not exists(select 1 from public.jobs_owners where user_id = owner_id and enabled) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_receipt) is distinct from 'object' or octet_length(p_receipt::text) > 16000
    or exists(select 1 from jsonb_each(p_receipt) item where jsonb_typeof(item.value) <> 'string' or
      item.key not in ('id','jobId','documentId','channel','destination','submittedAt','confirmation','receiptUrl','actor'))
    or not (p_receipt ?& array['id','jobId','documentId','channel','destination','submittedAt','confirmation','receiptUrl','actor']) then
    raise exception 'Invalid receipt' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
  select * into saved from public.jobs_submissions where user_id = owner_id and id = (p_receipt->>'id')::uuid;
  if found then
    if saved.job_id <> p_receipt->>'jobId' or saved.document_id <> (p_receipt->>'documentId')::uuid
      or saved.channel <> p_receipt->>'channel' or saved.destination <> p_receipt->>'destination'
      or saved.submitted_at <> (p_receipt->>'submittedAt')::timestamptz or saved.confirmation <> p_receipt->>'confirmation'
      or saved.receipt_url <> p_receipt->>'receiptUrl' or saved.actor <> p_receipt->>'actor' then
      raise exception 'Receipt ID already records a different application' using errcode = '23505';
    end if;
  else
    insert into public.jobs_submissions(id,user_id,job_id,document_id,channel,destination,submitted_at,confirmation,receipt_url,actor,resume_sha256,resume_filename)
      values((p_receipt->>'id')::uuid,owner_id,p_receipt->>'jobId',(p_receipt->>'documentId')::uuid,p_receipt->>'channel',
        p_receipt->>'destination',(p_receipt->>'submittedAt')::timestamptz,p_receipt->>'confirmation',p_receipt->>'receiptUrl',p_receipt->>'actor','','')
      returning * into saved;
  end if;
  return jsonb_build_object('receipt',to_jsonb(saved),'workspace',public.jobs_load_workspace());
end;
$$;
revoke execute on function public.jobs_validate_submission(),public.jobs_apply_submission() from public,anon,authenticated;
revoke execute on function public.jobs_record_submission(jsonb) from public,anon;
grant execute on function public.jobs_record_submission(jsonb) to authenticated;
