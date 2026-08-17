# Files, Uploads, OCR, And Document Extraction

This document describes the current file pipeline: upload validation, storage, image processing, OCR, direct text extraction, LLM extraction, regex fallback, previews, search, and UI display.

## Core Data Model

Job attachments are stored in `public.job_files`.

The base schema is in `supabase/migrations/0001_init.sql`:

- `company_id`
- `job_id`
- `uploaded_by`
- `file_name`
- `attachment_type`
- `storage_path`
- `thumbnail_path`
- `file_size`
- `file_hash`
- `ocr_text`
- `hidden_at`

Additional file metadata:

- `checklist_item_id` is added in `supabase/migrations/0004_file_checklist_link.sql`.
- `document_type` and `document_preview` are added in `supabase/migrations/0007_document_classification.sql`.

Important constraints and indexes:

- `uq_files_job_hash` prevents duplicate file content per job.
- Trigram indexes exist on `file_name` and `ocr_text` for search.
- Hidden files remain in storage and DB; they are excluded from normal lists.

## Allowed Upload Types

Client-side accepted extensions are defined in `src/lib/uploadValidation.ts`:

- `jpg`
- `jpeg`
- `png`
- `pdf`
- `doc`
- `docx`
- `xls`
- `xlsx`
- `txt`

Client validation is UX-only. Server validation is the source of truth.

Server classification is in `src/lib/services/files.ts`:

- JPEG/PNG are detected by extension or image magic bytes, then validated through `sharp`.
- PDF is accepted by extension or `%PDF-` magic bytes, but if extension says PDF and magic bytes do not match, the upload is rejected.
- `doc`, `docx`, `xls`, `xlsx`, and `txt` are treated as `other`.
- Unsupported extensions are rejected.

## Limits

Limits are centralized in `src/config/constants.ts`:

- `MAX_FILES_PER_REQUEST = 3`
- `MAX_FILES_PER_JOB = 15`
- `MAX_DOCUMENT_BYTES = 25 * 1024 * 1024`
- `IMAGE_MAX_DIMENSION = 1920`
- `IMAGE_MAX_OUTPUT_BYTES = 500 * 1024`
- `DOCUMENT_PREVIEW_MAX_CHARS = 500`

Note: `IMAGE_MAX_OUTPUT_BYTES` exists as a configured target, but current image processing uses fixed resize/compression settings rather than iterative recompression to guarantee that exact byte size.

## Job File Upload API

Primary route:

`POST /api/jobs/[id]/files`

Implemented in `src/app/api/jobs/[id]/files/route.ts`.

Request shape:

- Multipart form data.
- Field name: `files`, repeatable.
- Optional field: `checklist_item_id`.

Flow:

1. Authenticate with `withAuth`.
2. Load the job through `loadJobWithAccess`.
3. Enforce card mutability through `assertJobCardMutable`.
4. Parse multipart files.
5. Validate optional `checklist_item_id` belongs to the job.
6. Enforce max files per request.
7. Enforce max bytes per file.
8. Count existing non-hidden files and enforce max files per job.
9. Prepare each file concurrently:
   - read into `Buffer`
   - hash with SHA-256
   - reject duplicates by `job_id + file_hash`
   - classify type
   - process images if needed
   - determine text extraction strategy
10. Upload all storage objects.
11. Insert all `job_files` rows in one DB operation.
12. Create `image_uploaded` or `document_uploaded` timeline events.
13. Return the inserted file rows immediately.
14. Run text extraction and enrichment in the background.

The upload response does not wait for OCR, direct extraction, LLM extraction, or preview generation.

## Storage

Storage helpers live in `src/lib/storage/upload.ts`.

Behavior:

- Files are uploaded server-side only.
- Storage bucket defaults to `job-files` via `SUPABASE_STORAGE_BUCKET`.
- Storage paths are backend-generated UUID paths:

```text
jobs/{job_id}/{uuid}.{ext}
```

- Thumbnails use the same path format with `_thumb`.
- Uploads use `upsert: false`.
- Signed URLs expire after 3600 seconds.
- Signed URLs are generated only after DB-level authorization has already happened.

If any storage upload in a batch fails, already uploaded paths from that batch are deleted best-effort. If storage succeeds but the DB insert fails, uploaded paths are also deleted best-effort.

## Image Processing

Image helpers live in `src/lib/storage/image.ts`.

Supported input formats:

- JPEG
- PNG

Processing:

- `sharp` validates actual image format.
- EXIF orientation is applied with `.rotate()`.
- EXIF metadata is stripped by not calling `.withMetadata()`.
- Main image is resized to fit inside `1920x1920`.
- PNG with alpha stays PNG.
- Other images become JPEG at quality 72.
- Thumbnail is generated as JPEG, max dimension 320, quality 72.

For image uploads, both the processed main image and thumbnail are uploaded to storage.

## Text Extraction Strategy

The upload route prepares a `textExtract` descriptor per file.

Current behavior in `src/app/api/jobs/[id]/files/route.ts`:

- Images use Mistral OCR.
- PDFs use Mistral OCR.
- `doc`, `docx`, `xls`, `xlsx`, and `txt` use direct local extraction.
- Audio and unsupported files do not enter this pipeline.

The code comment in the upload route says images and PDFs use Mistral OCR while Office/TXT documents use direct extraction, and the implementation matches that.

## Mistral OCR

OCR lives in `src/lib/integrations/mistral.ts`.

Function:

```ts
extractText(buffer, mimeType)
```

Provider endpoint:

```text
https://api.mistral.ai/v1/ocr
```

Request:

- `model: mistral-ocr-latest`
- document is sent as a base64 `data:{mimeType};base64,...` URL.

Timeout:

- 30 seconds.

Failure policy:

- Missing `MISTRAL_API_KEY` returns `null`.
- Non-2xx returns `null`.
- Empty OCR result returns `null`.
- Network/timeout errors return `null`.
- OCR failure never fails the upload.

Response parsing:

- Prefer `pages[].markdown`.
- Fallback to `pages[].text`.
- Fallback to top-level `text`.
- Joined and trimmed text is returned.

## Office/TXT Direct Extraction

Direct extraction lives in `src/lib/documents/officeParse.ts`.

Function:

```ts
extractOfficeText(buffer, fileName)
```

Supported:

- `doc`
- `docx`
- `xls`
- `xlsx`
- `txt`

Behavior:

- `docx` / `doc`: uses `mammoth.extractRawText`.
- `txt`: decodes UTF-8 and strips null characters.
- `xlsx` / `xls`: uses `xlsx`, iterates sheets, emits sheet heading plus CSV text.

Failure policy:

- Unsupported type logs and returns `null`.
- Parser errors log and return `null`.
- Empty extracted text returns `null`.
- Extraction failure never fails the upload.

Note: the code comments state that Mammoth targets DOCX and legacy `.doc` often fails. That is treated as acceptable best-effort behavior.

## Document Classification

Document classification lives in `src/lib/documents/classify.ts`.

Emitted document types:

- `invoice`
- `offer`
- `contract`
- `service_report`
- `delivery_note`
- `other`

The constant list still includes `receipt` in `src/config/constants.ts` for backward compatibility, but new extraction emits receipt-like documents as `invoice`.

Classifier behavior:

- Uses weighted regex rules.
- Handles Slovenian, Croatian, German, Italian, and English keywords.
- Protects against bank-account uses of `račun`.
- Treats `predračun` as `offer` unless there is a clear invoice heading.
- Returns `other` if no score reaches the minimum threshold.

## LLM Extraction

Primary structured extraction is in `src/lib/documents/llmExtract.ts`.

Function:

```ts
extractDocumentFieldsWithLlm(text, fileName, attachmentType)
```

Provider endpoint:

```text
https://api.mistral.ai/v1/chat/completions
```

Model:

- `MISTRAL_DOCUMENT_EXTRACT_MODEL`
- default: `mistral-large-latest`

Timeout:

- `DOCUMENT_LLM_EXTRACT_TIMEOUT_MS`
- default: 15000 ms

Request settings:

- `temperature: 0`
- `max_tokens: 800`
- `response_format: { type: "json_object" }`

The LLM is asked to return only fields, never display text.

Expected JSON shape:

```json
{
  "document_type": "invoice|offer|contract|service_report|delivery_note|other",
  "document_number": "string|null",
  "customer_name": "string|null",
  "date": "string|null",
  "amount": "string|null",
  "title": "string|null",
  "confidence": {
    "document_type": 0,
    "document_number": 0,
    "customer_name": 0,
    "date": 0,
    "amount": 0,
    "title": 0
  }
}
```

Validation:

- Zod validates the JSON shape.
- Unknown document types are rejected.
- Fields are cleaned.
- Non-date fields must be contained in the source text after compact normalization.
- Amount containment has special normalization for `eur` and `€`.
- Dates are normalized and validated against dates detected in the source text.
- Invalid or hallucinated fields become `null`.

Classification prompt rules include:

- Main heading/title wins over incidental mentions.
- `Predračun`, `proforma`, `ponudba`, `ponuda`, `quote`, `Angebot`, `Offerte`, `preventivo`, etc. in the heading means `offer`.
- Bank-account labels such as `transakcijski račun`, `bankovni račun`, `IBAN`, etc. do not make a document an invoice.
- For invoices, customer means buyer/recipient, not issuer/vendor.
- For date, prefer issue/document/invoice date.
- For amount, prefer final payable/total due including tax.

Failure policy:

- Missing Mistral API key returns `null`.
- Non-2xx returns `null`.
- Empty model content returns `null`.
- Schema validation failure returns `null`.
- Request/parse errors return `null`.

## Regex Fallback

Fallback extraction lives in `src/lib/documents/preview.ts`.

Function:

```ts
extractDocumentFieldsWithRegex(text, fileName)
```

It extracts:

- document type through `classifyDocument`
- document number
- customer
- date
- amount
- title for `other`

It includes common labels in Slovenian, Croatian, English, German, and Italian.

If LLM extraction fails or returns no useful fields, `enrichDocumentFromText` falls back to regex.

## Date Normalization

Date normalization lives in `src/lib/documents/date.ts`.

The preview pipeline stores/display dates as normalized strings, for example:

```text
23.03.2013
```

The LLM validation path uses normalized date candidates from the source text, not exact raw string containment.

## Preview Generation

Preview generation lives in `src/lib/documents/preview.ts`.

The main entry point used by upload enrichment is:

```ts
enrichDocumentFromText(text, fileName, { attachmentType })
```

For typed documents, preview lines are:

1. Slovenian document type plus number if found
2. customer name
3. date
4. amount

Missing fields are skipped.

Examples:

```text
Račun 2025-018
Novak d.o.o.
12.06.2025
684,20 €
```

Fallback for typed documents:

```text
Račun · filename.pdf
```

For `other` documents:

```text
Dokument · filename.pdf
```

Optionally followed by a clear markdown heading/title and a date. Generic OCR lines are not used for `other`.

Preview text is truncated to `DOCUMENT_PREVIEW_MAX_CHARS`.

## Other Images

The enrichment result contains:

```ts
should_store_ocr_text
```

For images classified as `other`, this is `false`.

Upload enrichment behavior:

- Store `document_type = "other"`.
- Store `document_preview`.
- Store `ocr_text = null`.
- Do not create an `ocr_completed` timeline event.
- UI can show the thumbnail as the content instead of noisy OCR text.

Typed images keep OCR text and publish the OCR timeline event.

## Background Enrichment

After DB insert, upload route starts background enrichment with `void Promise.all(...)`.

For each inserted file with text extraction:

1. Extract text through Mistral OCR or Office/TXT parser.
2. If no text, stop.
3. Call `enrichDocumentFromText`.
4. Update `job_files` with:
   - `ocr_text`
   - `document_preview`
   - `document_type`
5. For typed documents, create an `ocr_completed` timeline event.

Errors are logged with `console.log` and do not affect the already completed upload.

## File Listing And Preview APIs

### Job Files

`GET /api/jobs/[id]/files`

Implemented in `src/app/api/jobs/[id]/files/route.ts`.

Behavior:

- Authenticated and job-access checked.
- Hidden files excluded by default.
- Owner/manager can request `include_hidden=true`.
- Adds `signed_url`.
- Adds `thumbnail_signed_url` when a thumbnail exists.

### Company Files

`GET /api/files`

Implemented in `src/app/api/files/route.ts`.

Owner/manager only.

Behavior:

- Lists company files for `/dashboard/office/db`.
- Hidden files excluded.
- Includes job title.
- Includes uploader display name.
- Includes document type and preview.
- Includes signed URL and thumbnail signed URL.

### Single File

`GET /api/files/[id]`

Implemented in `src/app/api/files/[id]/route.ts`.

Behavior:

- Loads one file by ID and company.
- Applies job access through `loadJobWithAccess`.
- Hidden files are visible only to owner, manager, or uploader.
- Returns fresh signed URLs.

### Hide File

`PATCH /api/files/[id]`

Behavior:

- Body must be `{ "hidden": true }`.
- Authorized for owner, manager, or uploader.
- Sets `hidden_at`.
- Creates a `file_hidden` timeline event.
- No unhide endpoint exists.

## UI Display

### Office DB

Main UI: `src/app/dashboard/office/db/page.tsx`.

The `Priponke` tab uses `GET /api/files`.

Sub-tabs:

- Vse
- Računi
- Dokumenti
- Slike
- Ostalo
- Zaznamki

Category mapping is in `src/lib/dbAttachmentCategory.ts`.

Display behavior:

- Filename is clickable.
- Preview opens through `AttachmentLightbox`.
- The AI/details column shows `document_preview`.
- For `other` images with `thumbnail_signed_url`, the UI shows an image thumbnail instead of OCR text.

### Worker Detail Modal

Main UI: `src/components/dashboard/WorkerDetailModal.tsx`.

Worker attachment lists show attachment filenames only. OCR/document preview text is intentionally hidden from worker UI.

Opening files uses the shared `AttachmentLightbox`.

### Attachment Lightbox

Shared UI: `src/components/dashboard/AttachmentLightbox.tsx`.

Behavior:

- 90vw by 90vh preview dialog.
- Top bar with filename.
- Image zoom controls.
- Image preview with `object-contain`.
- PDF iframe preview.
- Office document preview through Microsoft Office online viewer when URL is not local.
- Audio/video preview support.
- Fallback message for unsupported inline preview types.

## Search

`GET /api/search?q=...`

Implemented in `src/app/api/search/route.ts`.

Behavior:

- Searches `job_files.file_name`.
- Searches `job_files.ocr_text`.
- Company scoped.
- Workers are constrained to assigned jobs.
- Hidden files excluded.
- Returns signed URLs.

Because `other` image OCR text is discarded, those images do not pollute OCR search results.

## Environment Variables

Relevant env vars:

- `SUPABASE_STORAGE_BUCKET`
- `MISTRAL_API_KEY`
- `MISTRAL_DOCUMENT_EXTRACT_MODEL`
- `DOCUMENT_LLM_EXTRACT_TIMEOUT_MS`

Defaults:

- Storage bucket defaults to `job-files`.
- LLM extraction model defaults to `mistral-large-latest`.
- LLM extraction timeout defaults to 15000 ms.

## Known Caveats

- OCR and LLM enrichment are background best-effort; upload success does not guarantee immediate preview availability.
- PDFs always use Mistral OCR in the current implementation; direct PDF text extraction is not used.
- Legacy `.doc` extraction may fail because Mammoth primarily targets DOCX.
- There is no persistent structured table for extracted fields; only `ocr_text`, `document_type`, and `document_preview` are stored.
- There is no queue or retry system for failed background enrichment.
- `document_preview` is deterministic app-rendered text, but the field extraction can come from either Mistral LLM or regex fallback.
- Hidden files remain in storage and DB.
