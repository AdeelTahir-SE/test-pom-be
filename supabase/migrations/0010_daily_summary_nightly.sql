-- Daily summary: overnight one-shot generation (23:00 local).
-- status=failed records a permanent attempt so AI is never retried for that day.

alter table public.daily_summaries
  alter column generated_by drop not null;

alter table public.daily_summaries
  alter column summary_text drop not null;

alter table public.daily_summaries
  drop constraint if exists daily_summaries_text_not_blank;

alter table public.daily_summaries
  add column if not exists status text not null default 'ready';

alter table public.daily_summaries
  drop constraint if exists daily_summaries_status_check;

alter table public.daily_summaries
  add constraint daily_summaries_status_check
    check (status in ('ready', 'failed'));

alter table public.daily_summaries
  drop constraint if exists daily_summaries_ready_has_text;

alter table public.daily_summaries
  add constraint daily_summaries_ready_has_text
    check (
      status <> 'ready'
      or (summary_text is not null and length(trim(summary_text)) > 0)
    );

comment on column public.daily_summaries.status is
  'ready = show to managers; failed = attempt recorded, never retry AI for this day';
