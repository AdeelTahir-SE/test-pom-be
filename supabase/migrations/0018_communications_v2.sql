-- Communications v2 foundations: idempotent messages, explicit voice
-- transcription state, realtime-safe message reads, and durable push delivery.

alter table public.job_messages
  add column if not exists client_message_id uuid,
  add column if not exists transcription_status text,
  add column if not exists transcription_error text,
  add column if not exists transcribed_at timestamptz;

update public.job_messages
set transcription_status = case
  when message_type = 'voice' then 'completed'
  else 'not_applicable'
end
where transcription_status is null;

alter table public.job_messages
  alter column transcription_status set default 'not_applicable';

do $$ begin
  alter table public.job_messages
    add constraint job_messages_transcription_status_check
    check (
      transcription_status is null
      or transcription_status in (
        'not_applicable',
        'pending',
        'processing',
        'completed',
        'failed'
      )
    );
exception when duplicate_object then null; end $$;

create unique index if not exists job_messages_sender_client_message_unique
  on public.job_messages(sender_id, client_message_id)
  where client_message_id is not null;

create index if not exists idx_job_messages_company_job_thread
  on public.job_messages(company_id, job_id, created_at desc, id desc);

create index if not exists idx_job_messages_recipient_unread_v2
  on public.job_messages(company_id, recipient_id, created_at desc)
  where read_at is null;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

do $$ begin
  create policy push_subscriptions_select_own
    on public.push_subscriptions
    for select
    using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy push_subscriptions_insert_own
    on public.push_subscriptions
    for insert
    with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy push_subscriptions_delete_own
    on public.push_subscriptions
    for delete
    using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

create table if not exists public.notification_delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message_id uuid references public.job_messages(id) on delete cascade,
  notification_type text not null,
  channel text not null default 'push',
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  processing_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  constraint notification_delivery_jobs_status_check
    check (status in ('pending', 'processing', 'delivered', 'retry', 'failed', 'cancelled'))
);

create index if not exists idx_notification_delivery_pending
  on public.notification_delivery_jobs(status, next_attempt_at, created_at);

create index if not exists idx_notification_delivery_user
  on public.notification_delivery_jobs(user_id, created_at desc);

alter table public.notification_delivery_jobs enable row level security;

create or replace function public.comms_can_access_job(
  p_user_id uuid,
  p_company_id uuid,
  p_job_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and u.company_id = p_company_id
      and u.is_active = true
      and (
        u.role in ('owner', 'manager')
        or exists (
          select 1
          from public.job_assignments ja
          where ja.company_id = p_company_id
            and ja.job_id = p_job_id
            and ja.worker_id = p_user_id
        )
      )
  );
$$;

do $$ begin
  create policy job_messages_realtime_select_accessible
    on public.job_messages
    for select
    using (public.comms_can_access_job(auth.uid(), company_id, job_id));
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.job_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

create or replace function public.claim_notification_delivery_jobs(p_batch_size integer default 25)
returns setof public.notification_delivery_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select id
    from public.notification_delivery_jobs
    where channel = 'push'
      and status in ('pending', 'retry')
      and next_attempt_at <= now()
    order by next_attempt_at asc, created_at asc
    limit greatest(1, least(coalesce(p_batch_size, 25), 100))
    for update skip locked
  )
  update public.notification_delivery_jobs j
  set status = 'processing',
      processing_at = now(),
      attempts = attempts + 1,
      last_error = null
  from picked
  where j.id = picked.id
  returning j.*;
end;
$$;
