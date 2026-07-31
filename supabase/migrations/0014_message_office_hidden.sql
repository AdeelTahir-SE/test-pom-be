-- Soft-hide a communication card from the shared office KOMUNIKACIJA column
-- (all office roles share one channel — hide is company-visible, not per-user).

alter table public.job_messages
  add column if not exists office_hidden_at timestamptz;

create index if not exists idx_messages_office_board
  on public.job_messages (company_id, created_at desc)
  where office_hidden_at is null;
