-- =============================================================================
-- 0001_init.sql — Foundation v2 MVP schema
-- Job-centric model. "Daily Work Card" is a UI name for a Job (no separate table).
-- Every business table carries company_id for absolute tenant isolation.
-- Business records (messages, files, timeline) are immutable — no delete in MVP.
-- =============================================================================

-- Extensions -----------------------------------------------------------------
create extension if not exists pgcrypto;    -- gen_random_uuid()
create extension if not exists pg_trgm;      -- trigram search on file_name / ocr_text

-- Enums (closed sets per spec) -----------------------------------------------
do $$ begin
  create type user_role as enum ('owner', 'manager', 'worker');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('pending', 'in_progress', 'waiting', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_type as enum ('text', 'voice', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attachment_type as enum ('image', 'pdf', 'audio', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('job_assigned', 'job_updated', 'message_received', 'job_completed', 'system_alert');
exception when duplicate_object then null; end $$;

do $$ begin
  create type timeline_event_type as enum (
    'job_created', 'job_updated', 'worker_assigned', 'status_changed',
    'checklist_completed', 'image_uploaded', 'document_uploaded', 'message_sent',
    'voice_message_transcribed', 'ocr_completed', 'file_hidden',
    'notification_deleted', 'job_completed'
  );
exception when duplicate_object then null; end $$;

-- companies ------------------------------------------------------------------
create table if not exists public.companies (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  -- business_module is app-validated text (NOT an enum) so new modules need no migration.
  business_module     text not null,
  -- Kept as a plain access flag; billing logic is intentionally NOT built in MVP.
  subscription_active boolean not null default true,
  created_at          timestamptz not null default now()
);

-- users (extends auth.users) -------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        user_role not null,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_users_company on public.users(company_id);

-- jobs -----------------------------------------------------------------------
create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  created_by    uuid not null references public.users(id),
  status        job_status not null default 'pending',
  title         text not null,
  description   text,
  priority      text,
  customer      text,
  location      text,
  scheduled_at  timestamptz,
  started_at    timestamptz,
  completed_at  timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_jobs_company on public.jobs(company_id);
create index if not exists idx_jobs_company_sched on public.jobs(company_id, scheduled_at, created_at desc);

-- job_assignments (exactly one worker per job in MVP) ------------------------
create table if not exists public.job_assignments (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  job_id      uuid not null references public.jobs(id) on delete cascade,
  worker_id   uuid not null references public.users(id),
  assigned_by uuid not null references public.users(id),
  created_at  timestamptz not null default now(),
  unique (job_id)  -- one assignment per job
);
create index if not exists idx_assignments_company on public.job_assignments(company_id);
create index if not exists idx_assignments_worker on public.job_assignments(worker_id);

-- job_checklist_items --------------------------------------------------------
create table if not exists public.job_checklist_items (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  job_id              uuid not null references public.jobs(id) on delete cascade,
  label               text not null,
  order_index         integer not null default 0,
  is_completed        boolean not null default false,
  completed_at        timestamptz,
  requires_attachment boolean not null default false,
  created_at          timestamptz not null default now()
);
create index if not exists idx_checklist_company on public.job_checklist_items(company_id);
create index if not exists idx_checklist_job on public.job_checklist_items(company_id, job_id, order_index);

-- job_files ------------------------------------------------------------------
create table if not exists public.job_files (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  job_id          uuid not null references public.jobs(id) on delete cascade,
  uploaded_by     uuid not null references public.users(id),
  file_name       text not null,
  attachment_type attachment_type not null,
  storage_path    text not null,
  thumbnail_path  text,
  file_size       bigint not null,
  file_hash       text not null,            -- sha256 of original bytes (dedupe per job)
  ocr_text        text,                     -- populated later by OCR (nullable)
  hidden_at       timestamptz,              -- global hide (confirmed decision D2)
  created_at      timestamptz not null default now()
);
create index if not exists idx_files_company on public.job_files(company_id);
create index if not exists idx_files_job on public.job_files(company_id, job_id, created_at desc);
create index if not exists idx_files_name_trgm on public.job_files using gin (file_name gin_trgm_ops);
create index if not exists idx_files_ocr_trgm on public.job_files using gin (ocr_text gin_trgm_ops);
-- Dedupe guard: same file bytes cannot be re-inserted into the same job.
create unique index if not exists uq_files_job_hash on public.job_files(job_id, file_hash);

-- job_messages (unifies Foundation + Internal Messages specs) ----------------
create table if not exists public.job_messages (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  job_id        uuid not null references public.jobs(id) on delete cascade,
  sender_id     uuid not null references public.users(id),
  recipient_id  uuid references public.users(id),
  message_type  message_type not null default 'text',
  content       text,
  attachment_id uuid references public.job_files(id),  -- audio for voice messages
  is_urgent     boolean not null default false,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_messages_company on public.job_messages(company_id);
create index if not exists idx_messages_job on public.job_messages(company_id, job_id, created_at);
create index if not exists idx_messages_unread on public.job_messages(recipient_id, read_at);

-- notifications --------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  type        notification_type not null,
  title       text not null,
  body        text,
  job_id      uuid references public.jobs(id) on delete cascade,
  is_read     boolean not null default false,
  hidden_at   timestamptz,   -- per-user hide (each notification belongs to one user)
  created_at  timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read, hidden_at, created_at desc);

-- timeline_events (append-only, closed set) ----------------------------------
create table if not exists public.timeline_events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  job_id      uuid not null references public.jobs(id) on delete cascade,
  event_type  timeline_event_type not null,
  user_id     uuid references public.users(id),   -- null = system-generated
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_timeline_company on public.timeline_events(company_id);
create index if not exists idx_timeline_job on public.timeline_events(company_id, job_id, created_at);

-- office_reminders (PISARNA dashboard feature — decision D1) ------------------
create table if not exists public.office_reminders (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  created_by   uuid not null references public.users(id),
  title        text not null,
  description  text,                        -- <= 80 chars enforced in app
  is_urgent    boolean not null default false,
  remind_on    date,                        -- null = today
  actions      text[] not null default '{}',-- subset of allowed action ids (app-validated)
  action_state jsonb not null default '{}'::jsonb, -- confirm/reject toggles
  phone        text,
  link         text,
  order_index  integer not null default 0,
  hidden_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_reminders_company on public.office_reminders(company_id, hidden_at, order_index);

-- =============================================================================
-- Row Level Security — DENY BY DEFAULT.
-- The backend uses the service-role key (bypasses RLS) and enforces all authz
-- in code. Enabling RLS with NO policies means anon/authenticated JWT clients
-- get zero rows — a safety net against accidental direct-from-client access.
-- =============================================================================
alter table public.companies            enable row level security;
alter table public.users                enable row level security;
alter table public.jobs                 enable row level security;
alter table public.job_assignments      enable row level security;
alter table public.job_checklist_items  enable row level security;
alter table public.job_files            enable row level security;
alter table public.job_messages         enable row level security;
alter table public.notifications        enable row level security;
alter table public.timeline_events      enable row level security;
alter table public.office_reminders     enable row level security;
