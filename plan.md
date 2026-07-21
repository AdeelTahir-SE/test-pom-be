# SaaS Platform — MVP Backend (API) Build Plan

> **Scope of this plan:** Build the complete **backend/API layer** of the Foundation v2 platform
> using **Next.js (App Router) + TypeScript + Supabase**. UI is built later (separate plan).
> **Billing / payments / subscriptions are OUT OF SCOPE for now** (the entire "Subscriptions & Billing"
> spec section is deferred). Everything else in `project.md` is in scope.

> ## ✅ STATUS: All 13 phases complete.
> 139 tests passing across 15 test files, `npm run build` clean, zero DELETE endpoints,
> zero TypeScript errors. See §6 for per-phase detail. Next step: build the frontend/UI
> (separate plan) against this API, or run `npm run test` / `npm run build` to re-verify.

---

## 0. Guiding Principles (locked from `project.md`)

These rules are non-negotiable and govern every phase:

1. **One core entity: `Job`.** "Daily Work Card" is a UI name for a Job. No `daily_work_cards` table.
2. **Multi-tenant isolation is absolute.** Every table has `company_id`. Every query filters by it.
   Every mutation validates it. No cross-company access, ever — even with a valid UUID.
3. **Backend is the sole authority** for auth, authorization, validation, timestamps, and Timeline generation.
   The frontend is never trusted.
4. **Timeline is a closed, append-only event set.** No new event types. Backend-only emission.
   Timeline failure never rolls back the business operation.
5. **Business records are immutable.** Messages, Files, Timeline events are never edited or deleted.
   "Delete" in the UI = hide only. **No DELETE endpoints in MVP**, with one deliberate, narrow
   exception added post-launch by request: `DELETE /api/checklist-items/[id]` (owner/manager only,
   and only while `is_completed = false`). An unactioned checklist item has zero audit/history
   value — nothing has happened yet — so removing a mistaken entry is a data correction, not a loss
   of business record. The moment an item is completed it becomes historical and this endpoint
   refuses it. Every other resource keeps the hide/deactivate/cancel pattern.
6. **No over-engineering.** No workflow engine, no event bus, no queues, no background business
   computation, no analytics/derived tables, no caching of business state. All derived values are
   computed with SQL at request time.
7. **AI usage is limited to exactly two things:** voice transcription (Deepgram) and OCR (Mistral).
8. **Business Modules are configuration only** — a validated string on `companies`. Backend never
   interprets its meaning.

---

## 1. Tech Stack & Key Technical Decisions

| Concern | Decision | Why |
|---|---|---|
| Framework | Next.js (App Router) — API via Route Handlers (`app/api/**/route.ts`) | Matches requested stack; single deploy for API + future UI |
| Language | TypeScript (strict mode) | Requested |
| Database | Supabase Postgres | Requested |
| Auth | **Supabase Auth** (email/password) → issues JWT; backend verifies on every request | Spec requires JWT Bearer + backend authority. Supabase Auth gives us that for free |
| DB access | `@supabase/supabase-js` with **service-role key** inside Route Handlers only | Backend enforces all authz explicitly (spec rule). Service role bypasses RLS; we do checks in code |
| Defense in depth | RLS enabled on all tables as a safety net (deny-by-default), even though backend enforces primary authz | Cheap extra guard against accidental leaks |
| Validation | **Zod** for all request bodies/params | Deterministic 400s, typed inputs |
| Object storage | Supabase Storage, private bucket `job-files`, signed URLs only | Spec-locked (Supabase Storage add-on) |
| Image processing | `sharp` (resize, EXIF strip, compress, thumbnail) | Spec image pipeline |
| Voice transcription | Deepgram Nova-3 (sync HTTP) — **needs API key** | Spec-locked provider |
| OCR | Mistral OCR (auto, post-upload) — **needs API key** | Spec-locked provider |
| Testing | **Vitest** integration tests hitting the running dev server via `fetch`, per phase | "Test the API after each phase" requirement |
| IDs / time | All UUIDs and timestamps generated **server-side** (Postgres `gen_random_uuid()`, `now()` UTC) | Spec rule |

### Authentication flow (concrete)
- **Register:** create Supabase Auth user (admin API) → create `companies` row → create `users` row
  (role `owner`) in one logical transaction. Validate `business_module` against allowed list first.
- **Login:** `signInWithPassword` → return access JWT + refresh token.
- **Every protected request:** read `Authorization: Bearer <jwt>` → verify with Supabase → load the
  `users` row → build an `AuthContext { userId, companyId, role, active }`. Reject if inactive.
- **Authorization order (spec §12):** company isolation → authenticated → active → role → job access → resource access.

---

## 2. Proposed File / Folder Structure

```
saas_platform/
├─ src/
│  ├─ app/
│  │  └─ api/
│  │     ├─ health/route.ts                 # GET  health/db check
│  │     ├─ auth/
│  │     │  ├─ register/route.ts            # POST register company + owner
│  │     │  ├─ login/route.ts               # POST login
│  │     │  ├─ logout/route.ts              # POST logout
│  │     │  └─ me/route.ts                  # GET  current user + company + module
│  │     ├─ users/
│  │     │  ├─ route.ts                     # GET list / POST create (owner)
│  │     │  └─ [id]/route.ts                # GET / PATCH (activate, role, name)
│  │     ├─ jobs/
│  │     │  ├─ route.ts                     # GET list / POST create
│  │     │  └─ [id]/
│  │     │     ├─ route.ts                  # GET one / PATCH (status, assign, fields)
│  │     │     ├─ checklist/route.ts        # GET list / POST add item
│  │     │     ├─ files/route.ts            # GET list / POST upload
│  │     │     ├─ messages/
│  │     │     │  ├─ route.ts               # GET list / POST send
│  │     │     │  └─ read/route.ts          # PATCH mark all read
│  │     │     ├─ voice-message/route.ts    # POST voice → transcript message
│  │     │     └─ timeline/route.ts         # GET timeline
│  │     ├─ checklist-items/[id]/route.ts   # PATCH complete / edit / reorder
│  │     ├─ files/[id]/route.ts             # PATCH hide (per rules) / GET signed URL
│  │     ├─ messages/unread-count/route.ts  # GET unread count (polling)
│  │     ├─ notifications/
│  │     │  ├─ route.ts                     # GET list
│  │     │  └─ [id]/read/route.ts           # PATCH mark read  (+ hide action)
│  │     ├─ office-reminders/
│  │     │  ├─ route.ts                     # GET list / POST create
│  │     │  └─ [id]/route.ts                # PATCH reorder/hide/action-state
│  │     ├─ search/route.ts                 # GET global search (file_name, ocr_text)
│  │     ├─ dashboard/summary/route.ts      # GET field overview + urgent reminder (owner/manager)
│  │     └─ admin/                          # PLATFORM ADMIN ONLY — see §3.1
│  │        ├─ companies/route.ts           # GET list all companies (cross-tenant, read-only)
│  │        └─ companies/[id]/route.ts      # GET one company + stats (cross-tenant, read-only)
│  ├─ lib/
│  │  ├─ supabase/
│  │  │  ├─ admin.ts                        # service-role client (server only)
│  │  │  └─ auth.ts                         # token client for verifying user JWTs
│  │  ├─ auth/
│  │  │  ├─ context.ts                      # getAuthContext(req) -> CompanyUser | PlatformAdmin | null
│  │  │  └─ permissions.ts                  # role/permission matrix helpers
│  │  ├─ http/
│  │  │  ├─ responses.ts                    # ok(), created(), error() JSON helpers
│  │  │  └─ handler.ts                      # withAuth() wrapper + error boundary
│  │  ├─ validation/schemas.ts              # Zod schemas
│  │  ├─ timeline/events.ts                 # createTimelineEvent() + closed event enum
│  │  ├─ storage/
│  │  │  ├─ upload.ts                        # storage_path, upload, signed URLs
│  │  │  └─ image.ts                         # sharp pipeline (resize/EXIF/compress/thumb)
│  │  ├─ integrations/
│  │  │  ├─ deepgram.ts                      # sync transcription
│  │  │  └─ mistral.ts                       # OCR extraction
│  │  └─ services/                           # DB-facing business logic (thin over SQL)
│  │     ├─ jobs.ts  messages.ts  files.ts  checklist.ts  notifications.ts  reminders.ts
│  ├─ types/
│  │  ├─ db.ts                               # generated Supabase types
│  │  └─ domain.ts                           # AuthContext, enums, DTOs
│  └─ config/
│     ├─ business-modules.ts                 # allowed module list (validation)
│     └─ constants.ts                        # limits (file size, counts, polling)
├─ supabase/
│  ├─ migrations/                            # 0001_init.sql, 0002_..., one per phase
│  └─ seed.sql                               # dev seed data
├─ tests/
│  ├─ helpers/ (client.ts, factories.ts, cleanup.ts)
│  └─ phaseNN.*.test.ts                      # integration tests grouped by phase
├─ .env.local                               # (you provide — gitignored)
├─ .env.example                             # committed template
├─ vitest.config.ts
├─ tsconfig.json
└─ package.json
```

---

## 3. Database Schema (authoritative, reconciled)

The spec drifts between names (`messages`/`job_messages`, `files`/`job_files`, `work_card_id`/`job_id`).
Appendix A & B declare the **Job-centric** model authoritative, so this plan standardizes on:
`job_id` everywhere, and tables `job_messages`, `job_files`, `job_checklist_items`, `timeline_events`.

### Tables

**`companies`**
`id`, `name`, `business_module` (validated string), `subscription_active bool default true`
(kept as a no-op access flag; billing logic NOT built), `created_at`.

**`users`** (extends `auth.users`)
`id` (= auth uid), `company_id`, `email`, `full_name`, `role` (`owner`|`manager`|`worker`;
office/secretary map to `manager` for MVP), `is_active bool`, `phone` (for dialer), `created_at`.

**`jobs`**
`id`, `company_id`, `created_by`, `status` (`pending`|`in_progress`|`waiting`|`completed`|`cancelled`),
`title`, `description`, `priority`, `customer`, `location`, `scheduled_at`, `started_at`,
`completed_at`, `metadata jsonb default '{}'`, `created_at`.

**`job_assignments`** (one worker per job in MVP)
`id`, `company_id`, `job_id`, `worker_id`, `assigned_by`, `created_at` (unique on `job_id`).

**`job_checklist_items`**
`id`, `company_id`, `job_id`, `label`, `order_index`, `is_completed`, `completed_at`,
`requires_attachment bool default false`, `created_at`.

**`job_files`**
`id`, `company_id`, `job_id`, `uploaded_by`, `file_name`, `attachment_type`
(`image`|`pdf`|`audio`|`other`), `storage_path`, `thumbnail_path` (nullable), `file_size bigint`,
`file_hash` (sha256), `ocr_text` (nullable), `created_at`. Hidden state → see Decision D2.

**`job_messages`** (unifies Foundation + Internal Messages specs)
`id`, `company_id`, `job_id`, `sender_id`, `recipient_id` (nullable),
`message_type` (`text`|`voice`|`system`), `content`, `attachment_id` (nullable → audio file),
`is_urgent bool default false`, `read_at` (nullable), `created_at`.

**`notifications`**
`id`, `company_id`, `user_id`, `type` (`job_assigned`|`job_updated`|`message_received`|
`job_completed`|`system_alert`), `title`, `body`, `job_id` (nullable), `is_read bool`,
`hidden_at` (nullable, per-user hide), `created_at`.

**`timeline_events`** (append-only, closed set)
`id`, `company_id`, `job_id`, `event_type` (closed enum below), `user_id` (nullable = system),
`metadata jsonb`, `created_at`.

**`office_reminders`** (PISARNA dashboard feature — see Decision D1)
`id`, `company_id`, `created_by`, `title`, `description` (≤80 chars), `is_urgent bool`,
`remind_on date` (nullable = today), `actions text[]` (subset of allowed action ids),
`action_state jsonb default '{}'` (confirm/reject toggles), `phone`, `link`,
`hidden_at` (nullable), `order_index`, `created_at`.

### Closed Timeline event set (no additions ever)
`job_created`, `job_updated`, `worker_assigned`, `status_changed`, `checklist_completed`,
`image_uploaded`, `document_uploaded`, `message_sent`, `voice_message_transcribed`,
`ocr_completed`, `file_hidden`, `notification_deleted`, `job_completed`.

### Indexes (for request-time SQL, no derived tables)
`company_id` on every table; `(company_id, job_id)` on job children;
`job_assignments(worker_id)`; `job_messages(recipient_id, read_at)`;
`notifications(user_id, is_read, hidden_at)`; `timeline_events(job_id, created_at)`;
GIN/`pg_trgm` on `job_files.file_name` and `job_files.ocr_text` for search.

---

## 3.1 Platform Admin (internal/ops — NOT in original spec, added by request)

The spec's Permission Matrix (§12) only defines Owner/Manager/Worker, all scoped *inside* one company,
and states company isolation applies "even if a valid UUID" is used — no exception is written for a
platform-level role. To add oversight without weakening that guarantee, Platform Admin is built as a
**completely separate, parallel system** that never touches company-scoped authorization code:

- **`platform_admins`** table: `id` (= `auth.users.id`), `email`, `created_at`. **No `company_id`.**
  A user is either a company user (has a `public.users` row) or a platform admin (has a
  `platform_admins` row) — never both, never blended.
- **Auth resolution** (`getAuthContext`) returns a discriminated result: `{ kind: "company_user", ... }`,
  `{ kind: "platform_admin", ... }`, or `null`. Every company-scoped route handler explicitly requires
  `kind === "company_user"` — a platform admin token is simply rejected there, by construction, not by
  a permission check that could be misconfigured.
- **Scope: read-only, MVP-minimal.** `GET /api/admin/companies` (list all companies + basic counts),
  `GET /api/admin/companies/[id]` (one company + its users/jobs counts). No mutation endpoints, no
  cross-tenant writes, no impersonation — matches the spec's general "no admin tools" minimalism
  (see Module Immutability §9).
- **Bootstrapping:** there's no API to create the first platform admin (chicken-and-egg — nothing may
  authorize it). Instead: `scripts/create-platform-admin.mjs`, a CLI tool run by the developer/operator
  directly against Supabase using the service-role key — the same "manual DB fix by developer" pattern
  the spec already uses for business-module correction (§9).
- **Why this doesn't weaken tenant isolation:** platform admin endpoints live under `/api/admin/**` only,
  compute everything via request-time SQL (no derived tables — consistent with Part 9 SQL-only rule),
  and are never reachable from or referenced by any `/api/jobs`, `/api/users`, etc. handler. Company data
  access rules are unchanged for every non-admin endpoint.

---

## 4. Decisions (CONFIRMED with product owner)

- ✅ **D1 → Include Office Reminders** (`office_reminders` table + Phase 11).
- ✅ **D2 → Global `hidden_at`** for file/notification hide (simpler MVP).
- ✅ **D3 → Build Voice & OCR now, tested against mocked providers**; real keys plugged in later.
- ✅ **D4 → Reuse dev Supabase project** for integration tests.
- ✅ **Supabase → not set up yet**: I provide setup steps (see §5.1); build proceeds against placeholders until keys are supplied.

### Original decision notes

- **D1 — Office Reminders table.** The dashboard PISARNA column clearly needs persistence, but it's not
  in the Foundation core ERD. I'm adding an `office_reminders` table (it does not touch the Job model,
  so it doesn't violate "no new Job structures"). **Default: include it.** Alternative: defer to a later mini-phase.
- **D2 — File/Notification hide granularity.** Appendix says hide is "per user's default view" (per-user),
  but the Attachments spec uses a single `deleted_at`. Per-user hide needs a join table
  (`file_hidden_by(user_id, file_id)`). **Default (simpler MVP): global `hidden_at` column** + `file_hidden`
  timeline event, and same pattern for notifications. Switch to per-user only if you want it.
- **D3 — Voice & OCR timing.** Both need external paid API keys. **Default: build them as Phases 9–10,
  fully coded but tested against mocked providers**, so you can supply real keys whenever ready without
  blocking earlier phases.
- **D4 — Test database.** Integration tests run against your Supabase dev project using a dedicated
  `test-*` company that is created and torn down per run. **Default: reuse the dev Supabase project**
  (no separate paid project needed for MVP).

---

## 5. Environment Variables (I need these from you)

I'll commit `.env.example`; you fill `.env.local`. **Required to start (Phases 0–8):**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxx          # backend only, secret
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxx      # used only for Supabase Auth sign-in
SUPABASE_STORAGE_BUCKET=job-files
```

**Needed later (Phases 9–10 only):**

```
DEEPGRAM_API_KEY=xxxxxxxx                   # voice-to-text
MISTRAL_API_KEY=xxxxxxxx                    # OCR
```

> If you give me a Supabase project URL + service-role + anon key, I can wire and run everything.
> Until then I'll code against `.env.example` placeholders and you plug in real values before Phase 1 testing.

### 5.1 Supabase setup steps (you do this once, ~5 min)

1. Go to https://supabase.com → **New project** (free tier is fine for MVP). Pick a region near you, set a DB password.
2. When it's ready, open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (secret — keep private) → `SUPABASE_SERVICE_ROLE_KEY`
3. **Storage → Create bucket** → name `job-files`, **Private** (uncheck "Public bucket").
4. Paste all values into `.env.local` (I'll create the template). Tell me when done and I'll run migrations.
5. (Later, for Phases 9–10) create Deepgram + Mistral accounts and add those two keys.

---

## 6. Build Phases (each ends with API tests)

Every phase ends with: (a) Vitest integration tests that pass, (b) a short manual test checklist,
(c) all queries verified company-scoped. I won't start a phase until the previous one's tests are green.

### Phase 0 — Project Scaffolding & Foundation
- Init Next.js + TS (strict), install deps (`@supabase/supabase-js`, `zod`, `sharp`, `vitest`).
- Create folder structure, `.env.example`, Supabase clients, HTTP response/error helpers, `withAuth` wrapper.
- `GET /api/health` → checks DB connectivity.
- **Test:** health endpoint returns 200 + DB reachable; env loads; malformed request → clean 400 shape.

### Phase 1 — Database Schema & Migrations
- Write `0001_init.sql`: all tables, enums, constraints, indexes, RLS deny-by-default.
- `seed.sql` for dev; generate `types/db.ts`.
- **Test:** migrations apply cleanly; every table has `company_id`; enums reject bad values; seed loads;
  cross-company `SELECT` returns nothing under RLS.

### Phase 2 — Auth & Multi-Tenancy (+ Platform Admin, §3.1)
- `POST /auth/register` (validate business_module → create auth user + company + owner user),
  `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- `getAuthContext` (company_user | platform_admin | null) + `withAuth` + `withPlatformAdmin`.
- `platform_admins` migration; `scripts/create-platform-admin.mjs` bootstrap CLI;
  `GET /api/admin/companies`, `GET /api/admin/companies/[id]` (read-only, cross-tenant, SQL at request time).
- **Test:** register happy path; invalid module → 400; duplicate email → 409; login returns JWT;
  `/me` returns user+company+module; no-token/expired-token → 401; inactive user → 403;
  platform admin can list all companies across tenants; a normal company user gets 403 on `/admin/**`;
  a platform admin token gets 403 on company-scoped endpoints (e.g. `/jobs`) since it has no `company_id`.

### Phase 3 — User Management
- `GET/POST /users` (owner creates managers/workers), `GET/PATCH /users/[id]`
  (change role, name, activate/deactivate). Owner-only per matrix.
- **Test:** owner creates worker/manager; manager/worker blocked from user mgmt (403);
  users scoped to company; deactivation blocks login.

### Phase 4 — Jobs Engine (core)
- `POST /jobs`, `GET /jobs` (default order `scheduled_at ASC, created_at DESC`, worker sees only own),
  `GET /jobs/[id]`, `PATCH /jobs/[id]` (fields, status transitions, assignment).
- `createTimelineEvent` helper; emits `job_created`, `job_updated`, `worker_assigned`,
  `status_changed`, `job_completed`. Completed-job immutability enforced.
- **Test:** full lifecycle pending→in_progress→waiting→completed; worker sees only assigned jobs;
  worker cannot create; cross-company access rejected; editing completed job's locked fields → 403/409;
  each action wrote exactly one timeline event.

### Phase 5 — Checklist System
- `GET /jobs/[id]/checklist`, `POST /jobs/[id]/checklist` (owner/manager add),
  `PATCH /checklist-items/[id]` (complete = any assignee; edit/reorder/`requires_attachment` = owner/manager).
- Emits `checklist_completed`. Default order `order_index ASC`.
- **Test:** add/reorder/edit items (owner/manager only); worker can complete but not edit;
  completion sets `completed_at` + timeline event; completed-job checklist locked.

### Phase 6 — Timeline (read API)
- `GET /jobs/[id]/timeline` (default `created_at ASC`, company + job scoped).
- Verify the closed event set is enforced centrally.
- **Test:** timeline returns events from prior phases in order; closed-set enforcement (invalid type rejected
  at the helper level); cross-company job → 403; timeline read never mutates.

### Phase 7 — Files & Storage
- Create private bucket `job-files`. `storage/upload.ts` (path `jobs/{job_id}/{uuid}.{ext}`, signed URLs)
  and `storage/image.ts` (server MIME detect, EXIF fix/strip, resize ≤1920², compress ≤500KB, thumbnail).
- `POST /jobs/[id]/files` (image pipeline + docs; sha256 hash; limits: ≤3/request, ≤6/job, ≤25MB doc /
  image rules; atomic: storage + DB or fail), `GET /jobs/[id]/files` (non-hidden only, signed URLs),
  `PATCH /files/[id]` (hide → `file_hidden` event).
- Emits `image_uploaded` / `document_uploaded`. Timeline failure never rolls back upload.
- **Test:** image upload compresses + strips EXIF + makes thumbnail; hash dedupe per job; over-limit rejected;
  hidden file excluded from list but record remains; signed URL works, cross-company URL blocked; exactly one timeline event per upload.

### Phase 8 — Messages & Notifications
- `POST /jobs/[id]/messages` (text; ≤400 chars; `is_urgent`; manager↔worker rule),
  `GET /jobs/[id]/messages` (`created_at ASC`), `PATCH /jobs/[id]/messages/read` (bulk mark read),
  `GET /messages/unread-count`.
- Notifications: in-process create on new message (`message_received`) + on assign/complete;
  `GET /notifications` (`created_at DESC`), `PATCH /notifications/[id]/read`, hide → `notification_deleted`.
- Emits `message_sent` (user text only, not system/voice).
- **Test:** send/list/mark-read; 401-char rejected; worker→worker blocked; unread-count accurate;
  message creates recipient notification; read state (messages) independent from notification hidden state.

### Phase 9 — Voice-to-Text (Deepgram) *(needs `DEEPGRAM_API_KEY`; tested mocked)*
- `POST /jobs/[id]/voice-message`: upload audio (≤15s) → sync Deepgram (nova-3, sl) → create ONE
  `message_type=voice` message (`content=transcript`, `attachment_id=audio`), fallback content
  `"Voice message (untranscribed)"` on failure. Idempotency key = `attachment_id`. Emits `voice_message_transcribed` (NOT `message_sent`).
- **Test (mocked provider):** success stores transcript; provider failure still creates message + stores audio;
  retry with same audio does not duplicate; exactly one message + one timeline event.

### Phase 10 — OCR (Mistral) *(needs `MISTRAL_API_KEY`; tested mocked; automatic, not an endpoint)*
- After successful file upload + DB record, run Mistral OCR → store `ocr_text` → emit `ocr_completed`
  (user_id NULL). Upload never depends on/blocked by OCR. Failure → `ocr_text` NULL, still logged per spec.
- **Test (mocked):** upload triggers OCR, text stored + searchable; OCR failure doesn't fail upload;
  `ocr_completed` event with status metadata.

### Phase 11 — Office Reminders (PISARNA) *(pending Decision D1)*
- `GET/POST /office-reminders` (owner/manager; title required, desc ≤80, `actions[]` from allowed set,
  urgent, remind_on), `PATCH /office-reminders/[id]` (reorder, hide, confirm/reject action state).
- Workers cannot see/create. Notifies manager on new reminder.
- **Test:** create with action subset; worker blocked; future `remind_on` hidden until date; hide removes from list; confirm/reject toggles.

### Phase 12 — Search & Daily Summary (SQL-computed, no derived storage)
- `GET /search` (company-scoped over `file_name` + `ocr_text`, job-permission constrained).
- Daily summary data (dashboard top bar: per-worker progress `x/y`, single urgent reminder) via request-time SQL.
- **Test:** search finds by filename + OCR text, respects isolation & job access; summary counts match raw data;
  no derived/aggregate tables exist.

### Phase 13 — Hardening & Full Integration Sweep
- Cross-cutting: company-isolation sweep across ALL endpoints; full permission-matrix test;
  consistent error envelope + HTTP codes; POST returns created resource / PATCH returns updated;
  confirm no DELETE endpoints exist; timeline closed-set audit.
- **Test:** end-to-end scenario (register → users → job → checklist → files → messages → timeline)
  as owner/manager/worker; isolation red-team (company B cannot touch company A anything).

---

## 7. Testing Approach (per phase)

- **Runner:** Vitest. Integration tests call the running dev server (`http://localhost:3000/api/...`)
  with `fetch`, using real Supabase (dev) and a throwaway `test-<runid>` company cleaned up in `afterAll`.
- **Helpers:** `tests/helpers/client.ts` (authed request wrapper), `factories.ts` (make company/user/job),
  `cleanup.ts` (teardown). External providers (Deepgram/Mistral) mocked via injectable clients.
- **Command:** `npm run test` (all) and `npm run test -- phase04` (single phase).
- **Gate:** a phase is "done" only when its tests are green + the manual checklist passes. Then we proceed.

---

## 8. What is explicitly NOT built (deferred)

- All billing/subscriptions/Stripe/PayPal/webhooks (your request).
- Any frontend/UI, module JSON files, mobile client (separate later plan).
- Offline sync, push/SMS/email delivery infrastructure (in-app notifications only).
- Anything the spec forbids: workflow engine, analytics tables, event bus, background business jobs, extra AI.

---

## 9. Immediate Next Steps

1. You confirm this plan (and Decisions D1–D4 in §4).
2. You provide the Supabase env values in §5 (or a project to create them in).
3. I start **Phase 0**, then stop for your review after each phase's tests pass.
