-- Private, immutable document versions. Apply after jobs_portal.
create table public.jobs_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text,
  kind text not null check (kind in ('master_ats','master_outreach','tailored_resume','job_screenshot','supporting')),
  title text not null check (length(btrim(title)) between 1 and 160),
  filename text not null check (length(filename) between 1 and 180 and filename !~ '[/\\[:cntrl:]]' and filename !~ '^\.'),
  path text not null unique,
  mime text not null check (mime in ('application/pdf','image/png','image/jpeg','image/webp')),
  size integer not null check (size between 1 and 3800000),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (user_id, job_id) references public.jobs(user_id, id),
  check (path = user_id::text || '/' || id::text || '/' || filename),
  check (
    (kind in ('master_ats','master_outreach') and job_id is null and mime = 'application/pdf') or
    (kind = 'tailored_resume' and job_id is not null and mime = 'application/pdf') or
    (kind = 'job_screenshot' and job_id is not null and mime in ('image/png','image/jpeg','image/webp')) or
    kind = 'supporting'
  ),
  check (
    (mime = 'application/pdf' and filename ~* '\.pdf$') or
    (mime = 'image/png' and filename ~* '\.png$') or
    (mime = 'image/jpeg' and filename ~* '\.jpe?g$') or
    (mime = 'image/webp' and filename ~* '\.webp$')
  )
);
create index jobs_documents_owner_created on public.jobs_documents (user_id, created_at desc, id desc);
create index jobs_documents_job_created on public.jobs_documents (user_id, job_id, created_at desc, id desc);
alter table public.jobs_documents enable row level security;
revoke all on public.jobs_documents from anon, authenticated;
grant select, insert on public.jobs_documents to authenticated;

create policy jobs_documents_owner_read on public.jobs_documents for select to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled));
create policy jobs_documents_owner_append on public.jobs_documents for insert to authenticated
  with check (
    user_id = (select auth.uid()) and
    exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled) and
    exists (select 1 from storage.objects s where s.bucket_id = 'job-documents' and s.name = jobs_documents.path)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('job-documents', 'job-documents', false, 4000000, array['application/pdf','image/png','image/jpeg','image/webp']);

create policy jobs_documents_storage_read on storage.objects for select to authenticated
  using (
    bucket_id = 'job-documents' and (storage.foldername(name))[1] = (select auth.uid())::text and
    exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled)
  );
create policy jobs_documents_storage_append on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-documents' and (storage.foldername(name))[1] = (select auth.uid())::text and
    array_length(storage.foldername(name), 1) = 2 and
    (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and
    exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled)
  );
-- Compensating cleanup is allowed only before immutable metadata references a file.
-- There is no UPDATE policy, so uploads cannot overwrite previous versions.
create policy jobs_documents_storage_cleanup on storage.objects for delete to authenticated
  using (
    bucket_id = 'job-documents' and (storage.foldername(name))[1] = (select auth.uid())::text and
    exists (select 1 from public.jobs_owners o where o.user_id = (select auth.uid()) and o.enabled) and
    not exists (select 1 from public.jobs_documents d where d.path = name)
  );
