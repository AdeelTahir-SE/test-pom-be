-- Add-on 2 — Customer Knowledge (persistent customer notes)
-- Notes are informational operational guidance for future visits only.
-- No AI, no OCR coupling, no automatic job mutation.

create table if not exists public.customers (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  name             text not null,
  name_normalized  text not null,
  created_at       timestamptz not null default now(),
  unique (company_id, name_normalized)
);

create index if not exists idx_customers_company
  on public.customers (company_id);

create table if not exists public.customer_notes (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  customer_id  uuid not null references public.customers(id) on delete cascade,
  note         text not null,
  created_by   uuid not null references public.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint customer_notes_note_not_blank check (length(trim(note)) > 0)
);

create index if not exists idx_customer_notes_customer
  on public.customer_notes (customer_id, created_at desc);

create index if not exists idx_customer_notes_company
  on public.customer_notes (company_id);

alter table public.customers enable row level security;
alter table public.customer_notes enable row level security;

comment on table public.customers is
  'Add-on 2: lightweight customer identity per company (matched by normalized name).';
comment on table public.customer_notes is
  'Add-on 2: persistent notes shown on future jobs for the same customer.';
