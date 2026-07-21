# Frontend Integration Plan — `aura-personal-ai-main` → Backend API

> Companion to `plan.md` (backend build plan). This document maps every real screen in
> `aura-personal-ai-main` to the backend endpoints built in Phases 0–13, and lists every
> mismatch found so we can decide how to resolve each one **before** writing integration code.

---

## 0. What's actually in the folder

`extracted_media/` (29 images) is **not** screenshots of this app — it's the generic "AURA
Personal AI" landing-page template (hero, pricing, transformation section) that was used as a
styling reference. It's irrelevant to integration and can be ignored/deleted.

The real app lives in `src/`:

| File | What it is |
|---|---|
| `app/login/page.tsx` | Login form (office/worker toggle — currently fake, no real auth call) |
| `app/register/page.tsx` | Company + owner registration form |
| `app/dashboard/office/page.tsx` | The 3-column TEREN / PISARNA / KOMUNIKACIJA dashboard |
| `app/dashboard/worker/page.tsx` | Mobile worker screen (task card, voice, chat drawer) |
| `app/email-preview/page.tsx` | Dev utility — daily report email preview, no backend need |
| `app/page.tsx` + `components/landing/*` | Marketing landing page, no backend need |
| `components/dashboard/*` | WorkerCard, OfficeCard, CommunicationCard, SummaryCard, 3 "Add" modals, WorkerDetailModal |
| `lib/mockData.ts` | Hardcoded fake data — **every screen currently reads from this, not the network** |

Every dashboard/login/register page is a `"use client"` component with zero `fetch` calls today.
Integration = replace `mockData.ts` reads/local `useState` mutations with real API calls.

---

## 1. Screen → API mapping

### 1.1 Login (`app/login/page.tsx`)

| UI element | Backend call | Notes |
|---|---|---|
| Email + password submit | `POST /api/auth/login` | Store `access_token` (+ `refresh_token`) client-side |
| Office/Worker toggle | *(remove)* | Role must come from the login response (`user.role`), not a manual toggle — see Gap #1 |
| "Create account" link | → Register page | — |

### 1.2 Register (`app/register/page.tsx`)

| UI element | Backend call | Notes |
|---|---|---|
| Company name, full name, email, password | `POST /api/auth/register` | See Gap #2 (missing `business_module`) and Gap #3 (`full_name` not accepted today) |

### 1.3 Office Dashboard (`app/dashboard/office/page.tsx`)

| UI element | Backend call |
|---|---|
| "HITRI PREGLED" summary card | `GET /api/dashboard/summary` → `field_overview[]` |
| "NUJNE ZADEVE" summary card | `GET /api/dashboard/summary` → `urgent_reminder` |
| TEREN column (WorkerCard × N) | `GET /api/jobs` (owner/manager sees all) + `GET /api/jobs/[id]` for detail |
| WorkerCard checkbox toggle | `PATCH /api/checklist-items/[id]` `{is_completed:true}` |
| PISARNA column (CommunicationCard × N) | `GET /api/office-reminders` |
| CommunicationCard confirm/decline | `PATCH /api/office-reminders/[id]` `{confirm:true}` / `{reject:true}` |
| CommunicationCard dismiss (X) | `PATCH /api/office-reminders/[id]` `{hidden:true}` |
| CommunicationCard call icon | `tel:` link (client-only, matches spec — never stored) |
| KOMUNIKACIJA column (OfficeCard × N) | `GET /api/notifications` filtered to `type=message_received` (see Gap #4) |
| OfficeCard dismiss (X) | `PATCH /api/notifications/[id]` `{hidden:true}` |
| "+" on TEREN header → AddTaskModal | `POST /api/jobs` `{title, location, customer, scheduled_at, worker_id}` |
| "+" on PISARNA header → AddReminderModal | `POST /api/office-reminders` |
| AddWorkerCard | `POST /api/users` `{role:"worker", ...}` — see Gap #5 (no password field today) |
| WorkerDetailModal → checklist | `GET/POST /api/jobs/[id]/checklist`, `PATCH`/`DELETE /api/checklist-items/[id]` |
| WorkerDetailModal → attachments | `GET/POST /api/jobs/[id]/files` |
| WorkerDetailModal → timeline | `GET /api/jobs/[id]/timeline` |
| Logout button | `POST /api/auth/logout` |

### 1.4 Worker Dashboard (`app/dashboard/worker/page.tsx`)

| UI element | Backend call |
|---|---|
| Task card (progress badge, task list) | `GET /api/jobs/[id]` + `GET /api/jobs/[id]/checklist` (the worker's own active job) |
| Checkbox toggle | `PATCH /api/checklist-items/[id]` `{is_completed:true}` |
| "DODAJ KORAK" (add step) | `POST /api/jobs/[id]/checklist` |
| "PODROBNO" → opens WorkerDetailModal | same as office's modal, read-only-ish for workers |
| "POKLIČI" / "E-POŠTA" | `tel:` / `mailto:` links — client-only, matches spec |
| "GLASOVNO" (voice recording) | `POST /api/jobs/[id]/voice-message` (multipart audio) |
| "SPOROČILA" chat drawer — message list | `GET /api/jobs/[id]/messages` |
| Chat input send | `POST /api/jobs/[id]/messages` |
| Chat open (mark read) | `PATCH /api/jobs/[id]/messages/read` |

### 1.5 Shared components

| Component | Maps to |
|---|---|
| `SummaryCard` / `OverviewRow` / `UrgentRow` | `GET /api/dashboard/summary` — exact field match |
| `WorkerCard` | `jobs` + `job_checklist_items` (done/total) |
| `CommunicationCard` | `office_reminders` — action icons (`hasEmail`/`phoneNumber`/`hasAttachment`/`hasConfirm`/`hasDecline`) map almost 1:1 to `actions[]` + `phone` |
| `OfficeCard` | a `message_received` notification (see Gap #4) |
| `WorkerDetailModal` | Job detail: checklist + files + timeline, exactly per spec's "Job Details Screen" order |

---

## 2. Gaps found — FINAL DECISIONS (locked, no longer open)

> **Styling decision:** keep the current coded design as-is. The Figma screenshots reviewed
> separately showed a newer visual direction (per-worker color tags, cream/red-bordered PISARNA
> cards, colored KOMUNIKACIJA badges, an embedded phone-preview panel) — none of that is being
> adopted right now. Restyling can happen later as its own pass, after real data is wired in.

These are real mismatches between what the UI collects/expects and what the backend
currently stores or requires. Every one is resolved below — no further sign-off needed to proceed.

**#1 — Login role toggle is fake.** The UI lets the user manually pick "office" or "worker" at
login. Real role must come from `GET /api/auth/me` (or the login response's `user.role`) after
authenticating, and routing (`/dashboard/office` vs `/dashboard/worker`) should be driven by that,
not a UI toggle. → **Fix:** remove the toggle, route based on the real role.

**#2 — Register page never asks for `business_module`.** Your backend requires it
(`construction`, `field_service`, etc.) and rejects registration without it. → **FINAL: add a
dropdown** to the register form (all 7 allowed values from `ALLOWED_BUSINESS_MODULES`).

**#3 — Register page collects "Full name" but `POST /api/auth/register` doesn't accept it** (it
currently derives `full_name` from the email prefix). → **Fix:** trivial backend change — add
optional `full_name` to `registerSchema`, use it when provided.

**#4 — "KOMUNIKACIJA" column and "Dismiss" semantics.** The UI's `OfficeCard`/dismiss action
matches spec's "Communication Card" concept, which per spec is **not a message itself** — it's a
notification about a message. This already maps cleanly to your `message_received` notifications
(dismiss → `PATCH /api/notifications/[id] {hidden:true}`, which already fires
`notification_deleted` per spec). No backend change needed, just confirm this reading. →
**Decision:** confirm KOMUNIKACIJA = notifications feed, not raw messages.

**#5 — AddWorkerCard has no password field.** `POST /api/users` requires a password. →
**FINAL: auto-generate server-side.** `password` becomes optional on `POST /api/users`; if
omitted, the backend generates a secure random one and returns it once in the response
(`data.temporary_password`) so the office admin can share it with the new worker. Never stored
in plaintext anywhere, never returned again after this one response.

**#6 — AddWorkerCard's "Podjetje / vloga" field doesn't map to anything.** In `mockData.ts` this
is stored as `Worker.role` but holds values like "Novak d.o.o." (a customer name), not a
job/company role. It doesn't correspond to `users.role` (owner/manager/worker) or to anything
else in your schema. → **FINAL: drop the field.** It carries no backend meaning; removing it is
simpler than fabricating a place to store it.

**#7 — No `order_index` on `jobs` or on notifications.** → **FINAL: visual-only, not persisted.**
Drag-reordering WorkerCards/OfficeCards resets on refresh for now. No migration.

**#8 — AddReminderModal collects a separate "Čas" (time) field; `office_reminders.remind_on` is
a date only.** → **FINAL: drop the time field** from the UI. Spec never requires a specific
time-of-day for reminders, only a date.

**#9 — Office reminder "Priponka" (attachment) is UI-only — no real file storage.** Files can
only attach to a Job (`job_files.job_id` is `NOT NULL`); reminders aren't job-scoped, so a real
attachment is structurally impossible without violating "Files cannot exist outside a Job
context." → **FINAL: keep as a UI-only flag** (`actions` includes `"attachment"`, nothing is
actually uploaded) — hide the file picker in that flow so it doesn't imply a capability that
doesn't exist.

**#10 — `WorkerDetailModal`'s "Odgovorni" (responsible person) field in the "Add task" sub-dialog**
is hardcoded to a single fake worker option and never wired anywhere. → **FINAL: real worker
picker** sourced from `GET /api/users` (filtered client-side to `role === "worker"`), feeding
`POST /api/jobs`'s `worker_id`.

**#11 — Dashboard summary's `UrgentRow` expects a `time` string; `GET /api/dashboard/summary`'s
`urgent_reminder` currently returns `{id, title, description}` only.** → **FINAL: include
`created_at`** in that response; frontend formats it to `HH:MM`.

---

## 2.1 New: temporary English toggle (dev aid, will be removed later)

The frontend already ships a full `sl`/`en` i18n system (`useLanguage`, `translations.ts`,
`LanguageSwitcher`) but it's only wired into the login/register pages — `layout.tsx` even has
`{/* <LanguageSwitcher /> */}` commented out. The dashboard pages hardcode Slovenian text
directly in JSX instead of calling `t()`, and the existing `dash*` translation keys are stale
leftovers from an older dashboard version that don't match today's actual UI text.

**Plan:** uncomment `LanguageSwitcher` in the layout so it's visible everywhere, and convert the
office/worker dashboards' **static UI chrome** (column headers, button labels, modal titles/field
labels, section headings) to `t()` calls with fresh keys — not user-entered data (job titles,
messages, etc., stay as-is since translating live data isn't the point of this toggle). This is
explicitly temporary scaffolding for review purposes; safe to strip out later by reverting to
hardcoded Slovenian strings and removing the switcher.

---

## 3. Backend endpoints with **no** corresponding screen

These exist and are fully tested, but nothing in this frontend calls them yet. Not a
problem — just noting for completeness, in case a screen was expected somewhere:

- `GET/PATCH /api/users/[id]` — no "edit user" screen exists yet (only "add worker")
- `GET /api/search` — no search bar exists in this UI
- `GET/POST /api/admin/companies*` — expected; this is the internal Platform Admin tool, not
  part of the customer-facing app, so no screen is correct here
- `POST /api/jobs/[id]/files` for **PDF/doc** uploads specifically — the UI's file inputs don't
  distinguish file type, so this "just works" once wired, no separate screen needed

---

## 4. Auth/session strategy (needs to be built — currently doesn't exist)

None of this exists in the frontend yet:

1. Store `access_token` after login/register (recommend `localStorage` for MVP simplicity, or
   an httpOnly cookie set by a thin Next.js API route if you want better XSS protection later).
2. A shared `apiFetch()` helper that attaches `Authorization: Bearer <token>` to every call.
3. Route protection: redirect to `/login` if no token; redirect `/login` → `/dashboard/office` or
   `/dashboard/worker` based on the real `role` from `GET /api/auth/me`.
4. 401 handling: if any API call returns 401, clear the token and redirect to `/login`.
5. The 30-second polling rule (spec's Global Polling Rule) for `GET /api/messages/unread-count`
   and notifications — not implemented anywhere in the current UI.

---

## 5. Recommended integration order

Bottom-up, so each step is independently testable against your already-passing backend:

1. **Auth wiring** — login/register real calls + token storage + route protection (§4). Nothing
   else works without this.
2. **Register form fix** — add `business_module` picker, wire `full_name` (Gaps #2, #3).
3. **Office dashboard — read-only first** — wire `GET /api/dashboard/summary`,
   `GET /api/jobs`, `GET /api/office-reminders`, `GET /api/notifications` to render real data,
   before wiring any mutations.
4. **Office dashboard — mutations** — AddTaskModal → `POST /jobs`, AddReminderModal →
   `POST /office-reminders`, AddWorkerCard → `POST /users` (resolve Gap #5 first), checkbox
   toggles → `PATCH /checklist-items`, dismiss/confirm/decline actions.
5. **WorkerDetailModal** — checklist + files + timeline, all three GET/POST calls, including the
   "delete incomplete step" action → your narrow `DELETE /api/checklist-items/[id]`.
6. **Worker dashboard** — job detail, checklist toggle, chat (messages), voice recording.
7. **Polling** — add the 30-second unread-count/notifications poll last, once everything else is
   confirmed working.

---

## 6. Not touching yet

- Landing page (`app/page.tsx`, `components/landing/*`) — no backend need, cosmetic only.
- `email-preview` page — dev utility, no backend need.
- `extracted_media/` — irrelevant template screenshots, safe to delete whenever.
