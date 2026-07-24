-- Add-on 3 — AI Daily Summary & History
-- One saved historical snapshot per company calendar day.
-- Informational only: never drives workflows or mutates operational data.

create table if not exists public.daily_summaries (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  calendar_day  date not null,
  summary_text  text not null,
  attention     text,
  generated_at  timestamptz not null default now(),
  generated_by  uuid not null references public.users(id),
  constraint daily_summaries_text_not_blank check (length(trim(summary_text)) > 0),
  unique (company_id, calendar_day)
);

create index if not exists idx_daily_summaries_company_day
  on public.daily_summaries (company_id, calendar_day desc);

alter table public.daily_summaries enable row level security;

comment on table public.daily_summaries is
  'Add-on 3: AI-generated daily operational snapshot (read-only history).';
