# Client Revisions — What Was Asked, What Changed, How to Test

This covers every item from the client's revisions PDF (office dashboard,
worker forms, timeline, etc.), in the order the PDF raised them. For each
one: what was asked, what actually changed in the code, and exact steps to
verify it yourself.

**Before you start:**
- Dev server running (`npm run dev`), logged into an owner/manager account on `/dashboard/office`.
- A temporary EN/SL language toggle sits top-right on every page — doesn't affect any of this, ignore it.

## Quick summary

| # | Client asked for | Status |
|---|---|---|
| 0 | Remove "add worker" icon from TEREN column, move to Settings | ✅ Done |
| 1 | Example/dummy cards for empty columns, dismissible, daily reset | ✅ Done |
| 2 | Per-company sequential job numbering (#001, #002...) | ✅ Done |
| 3 | Attachments linked to the specific checklist step | ✅ Done |
| 4 | 2-step job creation form, repeatable tasks, "+1" adds 2 fields, no scroll cap | ✅ Done |
| 5 | Drag-and-drop reordering (cards + steps) actually persists | ✅ Done (all 3 places) |
| 6 | Timeline entries meaningful (who was assigned, no raw broken text) | ✅ Done |
| 7 | Step-deletion needs a confirmation popup | ✅ Done |
| 8 | Workers get an auto-code instead of a manual password | ✅ Done, tested end-to-end |
| 8b | Add Worker form: exact labels, spacing, email visual separation | ✅ Done |
| 8c | Smaller polish items (delete-X visibility, HITRI PREGLED text, hidden scroll cap) | ✅ Done |
| 8d | ACCESS dropdown needed to explain what Field/Office actually grant | ✅ Done (added after a real mix-up) |
| 9 | New accounts should get their credential by email | ✅ Done, needs your domain verified in Resend to reach real inboxes |
| 10 | KOMUNIKACIJA reply, worker mobile screen, owner mobile carousel | ✅ Already existed, confirmed still working |
| — | Message/voice timeline entries showing nothing useful | ✅ Done (shows a snippet of what was said) |
| — | Job numbers changing when a card is dragged | Confirmed **not** a bug — numbers are permanent by design, drag only changes position |

Full detail, reasoning, and test steps for each below.

---

## 0. TEREN column — remove the "add worker" icon (moved to Team settings)

**Asked for:** the field column should only have a "+" to add a card — no
add-worker icon there, since that belongs in Settings/My Account instead.

**Changed:** this was in the original PDF but I missed it in the first
pass. Fixed now: `src/app/dashboard/office/page.tsx` no longer passes an
add-worker action to the TEREN column header (only the "+" add-card icon
remains). The add-worker action now lives inside the Team management modal
(the people icon in the header) as an owner-only **"+ Add member"** button.

**How to test:**
1. Look at the TEREN column header.
   - ✅ Expected: only one icon ("+" add card) — no person-plus icon.
2. Click the people icon in the top header (Team).
   - ✅ Expected (as owner): a **"+ Add member"** link/button next to the "Team" title.
   - ✅ Expected (as manager, not owner): no add-member button — managers can't create accounts.
3. Click "+ Add member".
   - ✅ Expected: the Team modal closes and the Add Team Member form opens (same form as before — role, password policy from Section 8 below).

---

## 1. Office dashboard — template/"dummy" cards for empty columns

**Asked for:** instead of a blank "no cards yet" message, each of the 3
columns should show an example card (with placeholder text) so first-time
users see what a real card looks like. Dismissible via an X. Should
reappear the next day if the column is still empty.

**Changed:** `src/app/dashboard/office/page.tsx` — added a per-column,
per-day dismiss flag stored in the browser (`localStorage`), plus one
example `WorkerCard` / `CommunicationCard` / `OfficeCard` per column shown
only when that column has zero real items and hasn't been dismissed today.

**How to test:**
1. Log in with a brand-new company (or one with no jobs/reminders/messages yet).
2. Look at all 3 columns (TEREN, PISARNA, KOMUNIKACIJA).
   - ✅ Expected: each shows an example card with placeholder text ("Dodajte kartico za terence", "Dodajte zaznamke za vodjo", "Ni komunikacije...") instead of plain empty text.
3. Click the X on one of them.
   - ✅ Expected: that column now shows the plain "no items" text instead.
4. Refresh the page.
   - ✅ Expected: the dismissed one stays dismissed (doesn't reappear today).
5. To check the "reappears tomorrow" behavior without waiting a day: open browser dev tools → Application/Storage → Local Storage → delete the `dummy_dismissed_...` key for today's date, then refresh.
   - ✅ Expected: the example card comes back.

---

## 2. Per-company sequential job numbering (#001, #002...)

**Asked for:** the card number badge should be a per-company counter
starting at 001, not a random/internal ID.

**Changed:** New DB migration (`0003_job_sequence_numbering.sql`) adds a
`company_seq` column + trigger to `jobs`, auto-incrementing per company.
`src/lib/dashboardMappers.ts` exports `jobNumber()`, used on both the office
and worker dashboards instead of a UUID slice.

**How to test:**
1. Create a new job via the "+" in the TEREN column.
   - ✅ Expected: the card shows `#001` (or the next number in sequence for your company) — not a random-looking code.
2. Create a second job.
   - ✅ Expected: `#002`.
3. Have a worker open their own dashboard for one of these jobs.
   - ✅ Expected: same number shown in their header line.
4. Drag card #002 above #001 in the TEREN column (see item 5).
   - ✅ Expected: #002 stays #002 — only its position changes, not its number.
   - This is intentional, not a bug: the whole reason for this numbering was to have a permanent reference ("useful info for later," like an invoice number), which only works if it never changes. If you'd actually rather the numbers re-sequence to match visual order, tell me and I'll switch it — but that would work against the reason it was asked for in the first place.

---

## 3. Attachments linked to the correct checklist step

**Asked for:** when a photo/file is attached while completing a specific
step, it should actually be recorded against that step (previously it
wasn't saved anywhere real).

**Changed:** New migration (`0004_file_checklist_link.sql`) adds
`checklist_item_id` to `job_files`. The upload call from the "step complete
— attachment required" dialog now sends that ID; `GET .../checklist` now
computes and returns whether each step has a real attachment.

**How to test:**
1. Open a job's details (click a TEREN card), add a step, toggle "requires attachment" ON, add the step.
2. Try to mark that step complete without attaching anything.
   - ✅ Expected: blocked with a "Priponka manjka" warning, can't confirm.
3. Attach a file, then confirm.
   - ✅ Expected: step completes.
4. Close the details modal and reopen it (or refresh the page).
   - ✅ Expected: the step still shows as having an attachment (paperclip icon) — this is the part that used to reset/disappear on reload.

---

## 4. Task-creation form rebuilt into a proper 2-step flow

**Asked for:** the "add card" form should be 2 steps — job info, then a
repeatable list of tasks. Clicking "add task" should add 2 empty fields at
once (not 1). All entered tasks should show, no 4-item scroll limit. Fix:
wrong name binding, wrong task-count badge, attachments from the form not
showing up.

**Changed:** `src/components/dashboard/AddTaskModal.tsx` rebuilt as a
2-step form. Step 1 is the existing job-info fields. Step 2 is a repeatable
task list — each row has a name field (0/30 counter) and an
attachment-**required** toggle (not a file picker). "+Add steps" appends 2
rows at once. `office/page.tsx`'s `handleAddTask` now creates the job, then
creates each entered task via the checklist API in order.

**How to test:**
1. Click "+" in the TEREN column.
2. Fill in Task name, Worker (required), optionally Location/Customer/Date. Click **Next**.
   - ✅ Expected: moves to a "Steps" screen, not straight to creating the card.
3. Type a step name in the first row. Click **"+ Add steps"**.
   - ✅ Expected: 2 new empty rows appear (not 1).
4. Fill in 5–6 step rows total, toggle "Requires attachment" on one of them.
   - ✅ Expected: all rows stay visible, no internal scrollbar hiding any of them.
5. Click the final submit button.
   - ✅ Expected: card appears in the TEREN column with the correct worker name and a progress badge matching the exact number of steps you entered (e.g. `0/6`, not off by one).
6. Open the card's details.
   - ✅ Expected: all your steps are listed in the order you typed them, and the one you marked "requires attachment" shows that requirement when you try to complete it.

---

## 5. Drag-and-drop reordering actually saves now (all 3 places)

**Asked for:** the drag handle (left edge of cards/steps) should let you
reorder things, and it should actually work — reported as broken.

**Changed:** Reordering was already visual in some places but never saved.
Now all three persist:
- Checklist steps (`WorkerDetailModal.tsx`, via `PATCH /api/checklist-items/[id]`).
- PISARNA reminder cards (`office/page.tsx`, via `PATCH /api/office-reminders/[id]`) — already had an `order_index` field ready for this.
- **TEREN job cards** (`office/page.tsx`) — this one needed a new `display_order` column (migration `0005_job_display_order.sql`) since jobs previously had no manual-order field at all. I initially held off on this one because the column's default order is spec-defined (by scheduled time) — implemented it as an override: cards you've dragged sort by that manual order first; anything you've never touched still falls back to the original scheduled-time rule exactly as before, so nothing changes unless you actually drag something. Verified via direct API testing that both the override and the fallback behave correctly.

**How to test:**
1. In the TEREN column with 2+ cards, drag one card above another using its left-edge handle.
2. Refresh the whole page.
   - ✅ Expected: the new card order persists.
3. Open a job's details with 3+ steps. Drag one step to a new position using its left-edge handle.
4. Close the details modal, reopen it.
   - ✅ Expected: the new order is still there (previously it would snap back to the original order).
5. In the PISARNA column, drag one reminder card above another (grab the handle on its left edge).
6. Refresh the whole page.
   - ✅ Expected: the new card order persists.

---

## 6. Timeline showing meaningless / broken entries

**Asked for:** "Delavec dodeljen" (worker assigned) says nothing useful —
show who was actually assigned. Also two entries were showing as raw
broken text.

**Changed:** `src/components/dashboard/WorkerDetailModal.tsx`'s timeline
description function now has cases for `status_changed` and
`job_completed` (previously missing entirely, so they rendered as raw
"status changed" text). `worker_assigned` events now carry and display the
actual worker's name.

**How to test:**
1. Open a job's details → Timeline section.
2. Reassign the job to a different worker (via the office dashboard's edit/reassign, if available) or just check a freshly-created job.
   - ✅ Expected: timeline shows "Delavec dodeljen: [Actual Worker Name]", not just "Delavec dodeljen" with no name.
3. Change a job's status (e.g. Start → Wait, or complete it).
   - ✅ Expected: a clean, translated timeline entry appears — not raw English text like "status changed" or "job completed" mixed into an otherwise-Slovenian log.

---

## 7. Step-deletion confirmation

**Asked for:** deleting a step needs a confirmation popup — currently it
just deletes.

**Changed:** `WorkerDetailModal.tsx` — the X on an incomplete step now
opens a "are you sure?" dialog with Cancel/Delete instead of deleting
immediately.

**How to test:**
1. Open a job's details, hover a step, click its X.
   - ✅ Expected: a confirmation dialog appears naming the step, with Cancel and Delete buttons.
2. Click Cancel.
   - ✅ Expected: step is still there.
3. Click X again, then Delete.
   - ✅ Expected: step is removed.

---

## 8. Add Worker form — password policy change

**Asked for:** workers shouldn't have a manual password field at all — just
auto-generate a short login code and email it to them. Managers keep a
real password.

**Changed:** `src/components/dashboard/AddWorkerCard.tsx` — password field
now only shows when role = Manager. `src/app/api/users/route.ts` — workers
always get an auto-generated 3-character code (1 letter + 2 digits, e.g.
`K42`); managers keep the existing 8-character policy. Verified end-to-end
including actually logging in with a generated code.

**How to test:**
1. Click the person-plus icon (add team member).
2. Leave role on "Worker" (default).
   - ✅ Expected: no password field shown at all — just a note that a login code will be emailed.
3. Switch role to "Manager".
   - ✅ Expected: password field appears (optional, 8-char minimum if filled in).
4. Switch back to "Worker".
   - ✅ Expected: password field disappears again, and anything you'd typed there is cleared.
5. Submit as a Worker.
   - ✅ Expected: popup shows "Login code: XNN" (3 characters) — not a long password.
6. Log out, log in as that worker using the email + that exact 3-character code.
   - ✅ Expected: logs in successfully.

---

## 8b. Add Worker form — literal labels, spacing, and visual separation

**Asked for, and missed in the first implementation pass:** headline should
read "Dodaj zaposlenega"; name field label just "IME"; phone label "MOBI
ŠTEVILKA DELAVCA ZA KOMUNIKACIJO"; role field relabeled "DOSTOP" with
options "Pisarna"/"Teren" (not "Vloga"/Worker/Manager); more breathing room
between fields; the email field visually separated (it's their login) with
label "E-NASLOV DELAVCA" and helper text "To bo uporabljal ob prijavi v svoj
račun".

**Changed:** `AddWorkerCard.tsx` now uses dedicated translation keys for all
of these (didn't touch the shared ones used elsewhere, like the Team-edit
form's phone/name labels, so nothing else was affected). Field spacing
increased. Email field now sits in its own light-blue bordered box with the
helper text underneath. Role dropdown relabeled everywhere it appears
(Add + Edit), since "DOSTOP"/Pisarna/Teren should read consistently in both
places — the underlying stored role is unchanged, this is a label-only
change.

**How to test:**
1. Open "+ Add member" (see item 0).
   - ✅ Expected: title reads "Dodaj zaposlenega", name field says "IME", phone field says "MOBI ŠTEVILKA DELAVCA ZA KOMUNIKACIJO".
2. Look at the email field.
   - ✅ Expected: sits in its own light-blue box, labeled "E-NASLOV DELAVCA", with "To bo uporabljal ob prijavi v svoj račun" underneath.
3. Look at the role dropdown.
   - ✅ Expected: labeled "DOSTOP", options are "Teren" and "Pisarna" (not Worker/Manager).
4. Open the Team modal and edit an existing member.
   - ✅ Expected: same "DOSTOP"/Teren/Pisarna labeling there too, for consistency.

---

## 8c. Smaller items found on a deeper re-check

A few more literal, smaller asks I'd missed or only half-addressed the
first time through:

- **Step-deletion X wasn't "shown clearly"** — it was invisible until you hovered the row (so effectively undiscoverable on a touchscreen). Now it's dimly visible always, fully visible on hover.
- **HITRI PREGLED empty text** — was reusing the same generic "no cards" text as the TEREN column. Now has its own dedicated text ("Zaenkrat ni vnešenih nalog. Dodajte kartico.") matching what the client's second screenshot actually showed.
- **2-step task form's step list had a hidden height cap** (`max-h-[50vh]`) that would have forced an inner scrollbar around 4-5 rows on a typical screen — the exact "4 with a scroll" complaint from the PDF, just reintroduced in the new form. Removed it; the whole dialog now grows/scrolls as one piece instead of a cramped inner window.

- **Message/voice timeline entries now show what was actually said** — previously "Message sent" / "Voice message transcribed" with nothing else, so scrolling back through history later told you nothing about which message that was. Rather than inventing a message-numbering system (messages don't have one, and one wasn't asked for literally), the actual timeline events now carry a snippet of the real message content (`src/app/api/jobs/[id]/messages/route.ts`, `.../voice-message/route.ts`), and the timeline shows it truncated in quotes, e.g. `Message sent: "Delo je končano, grem na naslednji..."`.

Not changed, and why:
- **The "headline above everything" on the office dashboard** — client explicitly said "not a priority right now," so left alone.

---

## 8d. ACCESS dropdown needed to explain what it actually grants

**What happened:** after 8b relabeled the role field to "DOSTOP" with
options "Pisarna"/"Teren" (Office/Field) per the client's literal wording,
a real mix-up followed from it — a manager account got created by
selecting "Office" without realizing that option grants full manager-level
access (team management, company settings, everything), not "an
office-based worker." Confirmed via direct testing this was not a bug —
Field always correctly creates a worker and Office always correctly
creates a manager — just a labeling ambiguity the client's own requested
wording introduced.

**Changed:** `AddWorkerCard.tsx` and `TeamManagementModal.tsx` — added a
one-line explanation under the ACCESS dropdown that updates live based on
the current selection, e.g. "Office: full manager access — the dashboard,
team management, and company settings." Didn't revert or second-guess the
"Pisarna"/"Teren" wording itself since that was a literal, explicit client
request — just added the missing context so it can't be picked by mistake
again.

**How to test:**
1. Open "+ Add member", look under the ACCESS dropdown.
   - ✅ Expected: a line explaining what "Teren" grants.
2. Switch to "Pisarna".
   - ✅ Expected: the line updates to explain manager-level access instead.
3. Same check in the Team modal's edit-member view.

---

## 9. Welcome email on account creation

**Asked for:** (implied by the password-code flow) the new worker/manager
should receive their credential by email, not just see it once in a popup.

**Changed:** Resend integration added (`src/lib/integrations/resend.ts`),
wired into account creation. Your API key is now configured and verified
working.

**How to test:**
1. Create a new worker/manager using an email address you can actually check (or your own Resend-verified address, since the sandbox sender currently only delivers to that).
   - ✅ Expected: an email arrives with the login code / temporary password.
   - Note: until you verify your own sending domain in Resend and update `RESEND_FROM_ADDRESS`, this will only actually deliver to your own Resend account email — everyone else will just get the one-time popup as before (which still always works regardless of email).

---

## 10. Communication column reply + mobile layouts

**Asked for:** office should be able to reply to workers (voice + text) from the KOMUNIKACIJA column; worker's own mobile screen should mirror the TEREN card; owner/manager should get the full 3-column dashboard on mobile, swipeable between columns.

**Changed:** Nothing new here — all three were already built (reply button + chat dialog on KOMUNIKACIJA cards; worker's own single-card mobile view; and a swipeable column carousel with prev/next arrows on the office dashboard below desktop width). Confirmed still working after the recent merge.

**How to test:**
1. On the office dashboard, find a KOMUNIKACIJA card and click its reply icon.
   - ✅ Expected: a chat dialog opens with text + voice reply.
2. Shrink your browser window below ~1024px wide (or open on a phone).
   - ✅ Expected: columns become swipeable one-at-a-time, with left/right arrows and no functionality lost.
3. Log in as a worker on a narrow screen.
   - ✅ Expected: see only their own job card, with Details/Call/Email/Voice/Messages quick actions.

---

## Known gaps / things to decide

- **Real email delivery** — the API key is configured and verified working, but you're still on Resend's sandbox sender (`onboarding@resend.dev`), which typically only delivers to the email you signed up to Resend with. To actually reach real worker inboxes, verify your own domain in Resend and update `RESEND_FROM_ADDRESS`.
