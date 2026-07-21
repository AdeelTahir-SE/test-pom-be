-- Manual drag-and-drop ordering for job cards within the TEREN column.
-- Nullable: jobs nobody has manually reordered fall back to the existing
-- scheduled_at/created_at sort (Appendix A §7) unchanged. Once a job is
-- dragged, it and its column siblings get an explicit display_order and
-- sort by that first; everything else keeps sorting after them by the
-- original rule.
alter table public.jobs add column if not exists display_order integer;
create index if not exists idx_jobs_display_order on public.jobs(company_id, display_order);
