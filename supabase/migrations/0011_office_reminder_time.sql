-- Optional wall-clock time entered on the reminder form (HH:mm).
-- Distinct from created_at (when the card was saved) and from remind_on (calendar day).
alter table public.office_reminders
  add column if not exists remind_time text;
