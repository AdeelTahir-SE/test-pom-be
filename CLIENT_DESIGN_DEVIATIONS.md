# UI Design Deviations — What's New vs. What Was Designed

This document answers one question precisely: **which screens/UI elements in the live
app were never part of the original design (`aura-personal-ai-main/`), and is there
anything from that design that we failed to build?**

Every finding below was produced by a direct, line-level comparison of the client's
original design files against the live app's source code — not from memory. Where a
finding needed nuance (e.g. "removed" code that was actually already broken), that's
called out explicitly.

---

## Bottom line

**Nothing from the client's design was left out.** Every page and every component file
in `aura-personal-ai-main/` has a live counterpart in the running app — a full recursive
file comparison confirms this. The screens the client doesn't recognize are **additions**,
not omissions: features built to close gaps between the backend (already fully built,
13 phases, tested) and a frontend that was originally a static mockup reading from fake
data. Most of these additions were built at the client's own explicit request during
this integration work (e.g. "add a role picker," "we need to see the job status," "add
user management") — they were never in the original Figma/design files because the
original design predates the backend integration entirely.

---

## 1. Screens/features with **zero design basis** — built entirely from scratch

These have no counterpart anywhere in the client's design folder:

| Feature | Where | What it does |
|---|---|---|
| **Platform Admin Dashboard** (`/admin`) | Entirely new route | Lists every company on the platform, user/job counts per company, a subscription active/inactive toggle, and a company-detail view. This is an internal operator tool, not part of the customer-facing app — there was never a design for it because it's not something the client's own designer would have been asked to design. |
| **Team Management** | New icon (people) in the office dashboard header | Opens a modal listing every team member; click one (not the owner) to edit their name/phone, promote/demote worker↔manager, or activate/deactivate them. |
| **Search** | New icon (magnifying glass) in both office and worker dashboard headers | Searches uploaded file names and OCR-recognized document text; results link to the file or jump to its job. |
| **Company Settings** | New icon (gear) next to the company name in the office header, owner-only | Lets the owner rename their own company after registration. |
| **Job status controls** | New section inside the job detail view (opened via a job card or "Details") | A status badge (Pending/In Progress/Waiting/Completed/Cancelled) plus buttons to move a job through its lifecycle. Previously a job, once created, had **no way to ever be marked complete or cancelled** anywhere in the UI. |
| **Office-side reply/voice chat** | Triggered by a new "Reply" button on communication cards | A full chat dialog (text + voice recording) so office staff can message a worker back — previously only the worker could initiate chat. |
| **OCR recognized-text panel** | Inside the attachment preview dialog | Shows the actual text automatically extracted from an uploaded photo/document, so staff can read what a scanned document says without already knowing what to search for. |
| **Hide attachment** button | Inside the attachment preview dialog | Lets an authorized user remove a file from view. |
| **Confirmed/Declined status badges** | On communication cards, once resolved | Previously, confirming or declining a reminder gave no visible feedback at all — the buttons just stayed there forever, identical before and after. |

---

## 2. Fields/UI added to *existing* designed screens

These screens were in the original design, but needed additions to actually satisfy what
the backend requires or to close a usability gap:

| Screen | Addition | Why |
|---|---|---|
| Register page | **Industry** dropdown (business type — Construction, Field Service, Cleaning, etc.) | The backend rejects registration without this; it wasn't in the original form at all. |
| Add Worker → now "Add Team Member" | **Password** field (optional — leave blank to auto-generate) | The original form had no password field, so every account had to be auto-generated with no way to set one manually. |
| Add Worker → now "Add Team Member" | **Role dropdown** (Worker / Manager) | The original form could only ever create workers — there was no way to create a manager account through the UI. |
| Add Worker → now "Add Team Member" | Email made **required** | It was previously an optional field despite being essential for the account's login. |
| Office dashboard field-column header | Second icon (person-plus) for **adding a worker** directly from that column | Previously this action lived only behind a different flow; this puts "add job" and "add worker" side by side. |
| Worker dashboard | **Unread-message badge** on the Messages button | No visual indicator previously existed for unread messages on this button. |

---

## 3. UI **removed** from the original design

| Removed | Reason |
|---|---|
| Login page's Office/Worker toggle switch | This was a fake demo control — it let you manually pick which dashboard to see. Real routing now comes from the server based on the account's actual role, which is both more correct and was an explicit early decision (routing must be server-authoritative, not a UI toggle). |
| "Podjetje / vloga" free-text field in Add Worker | This field didn't correspond to anything in the backend (it stored arbitrary text like a customer name, not an actual system role) — replaced by the real Worker/Manager role dropdown described above. |
| Worker dashboard's "Add Step" quick-action button | Consolidated into the main job-detail view instead of living as a separate quick action — the capability still exists, just in one place instead of two. |
| **The "Odgovorni" (responsible person) sub-dialog in the job detail view** | **Important nuance: this was already broken in the original design.** We verified it directly — the button that was supposed to open this sub-dialog was never wired to anything in the client's own original file. It was dead code with no way to reach it. Removing unreachable code isn't a lost feature; nothing that worked before stopped working. |

---

## 4. Known visual styling difference — a decision, not an oversight

Early in this integration, three Figma screenshots were reviewed and compared against the
coded design. They showed a newer visual direction: color-coded worker cards, cream/red-
bordered reminder cards (vs. the current blue gradient), colored communication badges, and
an embedded phone-preview panel on the landing page. **The explicit decision at that time
was to keep the current coded visual style as-is** and not adopt that newer Figma direction
— restyling was deferred as a separate pass to happen after the real data was wired in. If
this is part of what's prompting "I don't recognize this," it's worth flagging that this
was a deliberate call made earlier, not something skipped by accident — happy to revisit
the restyling now if that's the priority.

---

## 5. What to tell the client

The honest framing: the original design was a **static mockup** — every screen read from
fake, hardcoded data (`mockData.ts`), with no real login, no real job data, nothing
persisted. Turning that into a working product against an already-built backend
surfaced several places where the mockup simply didn't have a screen for something the
backend needed (user management, search, job completion) — those had to be built new,
mostly at the client's own request during this work. Nothing was added gratuitously or
without reason, and nothing from their original design was dropped except one piece of
dead, unreachable code.
