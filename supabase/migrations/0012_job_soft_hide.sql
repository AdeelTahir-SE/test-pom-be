-- Soft-hide for TEREN job cards (Mark task 4): office can dismiss a card from
-- the board without destroying the row. Checklist, files, messages, and
-- timeline_events stay attached. hidden_by records who dismissed it.

alter table public.jobs
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.users(id);

create index if not exists idx_jobs_company_hidden
  on public.jobs(company_id, hidden_at);

-- Who dismissed a PISARNA reminder (audit; row already kept via hidden_at).
alter table public.office_reminders
  add column if not exists hidden_by uuid references public.users(id);
