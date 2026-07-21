-- Link uploaded files to the specific checklist item they were attached for
-- (previously job_files only linked to job_id, so "does this step have an
-- attachment" could never be answered from real data).

alter table public.job_files
  add column if not exists checklist_item_id uuid references public.job_checklist_items(id) on delete set null;

create index if not exists idx_files_checklist_item on public.job_files(checklist_item_id) where checklist_item_id is not null;
