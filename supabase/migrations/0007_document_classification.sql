-- Add-on 1 — Document Classification & Preview
-- Informational fields only: never trigger workflows. Populated once after
-- successful OCR; original ocr_text and uploaded file remain unchanged.

alter table public.job_files
  add column if not exists document_type text,
  add column if not exists document_preview text;

-- Closed set from Add-on 1 §1. Null when OCR has not run / failed.
alter table public.job_files
  drop constraint if exists job_files_document_type_check;

alter table public.job_files
  add constraint job_files_document_type_check
  check (
    document_type is null
    or document_type in (
      'invoice',
      'delivery_note',
      'contract',
      'service_report',
      'offer',
      'receipt',
      'other'
    )
  );

comment on column public.job_files.document_type is
  'Add-on 1: deterministic OCR classification. Informational only.';
comment on column public.job_files.document_preview is
  'Add-on 1: concise preview generated once after OCR (~300–500 chars).';
