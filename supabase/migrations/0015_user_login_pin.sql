-- Company-visible staff login PIN (workers/managers created by the owner).
-- Mark: worker passwords are a shared office channel, not private accounts —
-- the company must always be able to see the PIN next to each name.
alter table public.users
  add column if not exists login_pin text;

comment on column public.users.login_pin is
  'Plaintext login credential set by the company for staff (e.g. 4-digit worker PIN). Visible to owner/manager only via API.';
