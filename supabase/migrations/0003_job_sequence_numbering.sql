-- Per-company sequential job numbering (#001, #002, ...) instead of a raw
-- UUID slice on dashboard cards. Each company gets its own counter starting
-- at 1, tracked in company_job_counters and assigned atomically via trigger.

create table if not exists public.company_job_counters (
  company_id uuid primary key references public.companies(id) on delete cascade,
  last_seq   integer not null default 0
);

alter table public.jobs add column if not exists company_seq integer;

create or replace function public.assign_job_company_seq()
returns trigger
language plpgsql
as $$
declare
  next_seq integer;
begin
  insert into public.company_job_counters (company_id, last_seq)
  values (new.company_id, 1)
  on conflict (company_id)
  do update set last_seq = public.company_job_counters.last_seq + 1
  returning last_seq into next_seq;

  new.company_seq := next_seq;
  return new;
end;
$$;

drop trigger if exists trg_assign_job_company_seq on public.jobs;
create trigger trg_assign_job_company_seq
  before insert on public.jobs
  for each row
  when (new.company_seq is null)
  execute function public.assign_job_company_seq();

-- Backfill existing rows, oldest first per company, and seed the counters
-- table so future inserts continue from the right number.
with numbered as (
  select id, row_number() over (partition by company_id order by created_at asc) as seq
  from public.jobs
  where company_seq is null
)
update public.jobs j
set company_seq = numbered.seq
from numbered
where j.id = numbered.id;

insert into public.company_job_counters (company_id, last_seq)
select company_id, max(company_seq)
from public.jobs
where company_seq is not null
group by company_id
on conflict (company_id) do update set last_seq = greatest(public.company_job_counters.last_seq, excluded.last_seq);

alter table public.jobs alter column company_seq set not null;
create unique index if not exists uq_jobs_company_seq on public.jobs(company_id, company_seq);
