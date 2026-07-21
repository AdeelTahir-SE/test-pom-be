# Manual Testing Guide

Step-by-step walkthrough to test every feature of the app in your own browser.
Follow it top to bottom, or jump to a section. Each step says exactly what to
click/type, and what should happen.

**Before you start:**
- Make sure the dev server is running: `npm run dev`, then open `http://localhost:3000`.
- A temporary EN/SL language toggle sits top-right on every page. This guide
  assumes it's set to **EN** — button/label names below match that. It doesn't
  affect functionality either way and will be removed before launch.
- Voice messages will actually transcribe for real here (unlike when I test
  them myself) — you're running the server on your own machine with real
  internet access, so it reaches Deepgram normally.

---

## 1. Registration (Owner / Office account)

1. Go to `/register`.
2. Fill in: Company Name, Industry (any option), Full Name, Email, Password (8+ chars), check the terms box.
3. Click **Register**.
   - ✅ Expected: you land on the office dashboard (`/dashboard/office`) immediately, no errors.
4. Refresh the page.
   - ✅ Expected: you stay logged in (session persists), dashboard loads again.

## 2. Login / Logout

1. Click the logout icon (top-right of the office dashboard header).
   - ✅ Expected: redirected to `/login`.
2. Log back in with the same email/password.
   - ✅ Expected: back on the office dashboard.
3. Try logging in with a wrong password.
   - ✅ Expected: red error banner, stays on `/login`.

---

## 3. Office Dashboard — Field column ("TODAY — FIELD")

### 3.1 Add a worker
1. Click the **person-plus icon** at the top of the left (field) column.
2. Fill in Name (required), Phone (optional — try both a valid and an invalid number to see validation), Email.
3. Click **ADD WORKER**.
   - ✅ Expected: a popup shows a temporary password — **copy it down**, you'll need it in Section 5.
   - ✅ Expected: modal closes, no page reload needed.

### 3.2 Add a job/task
1. Click the **"+"** next to the person-plus icon.
2. Fill in: Task name (required), Location, Customer, Date (free text, cosmetic only).
3. Select the worker you just created from the **Worker** dropdown (required).
4. Click **ADD TO SCHEDULE**.
   - ✅ Expected: a new worker card appears in the field column showing that task.

### 3.3 Checklist on the card
A brand-new job has no checklist items yet (you'll see "0/0"), so there's
nothing on the card to click until you add a step — that's expected, not a
bug. Workers can't add their own checklist items (office/owner only), so
add the first one from here:
1. Click the worker card itself (not the checkbox) to open its detail panel — this is the same panel covered in 3.4, so if you do 3.4 first you can skip straight to step 4 below.
2. Click the **"+"** next to "Planned Work".
3. Fill in a step name (required) and submit.
   - ✅ Expected: the step appears in "Planned Work", and the card's badge updates from 0/0 to 0/1.
4. Close the panel and go back to the field column.
   - ✅ Expected: the card now shows that checklist item, unchecked.
5. Click the item directly on the card (not opening the panel).
   - ✅ Expected: checkbox fills in green, a timestamp appears, and the badge updates to 1/1.

### 3.4 Worker detail modal (click the card itself)
1. Click anywhere on the worker card (not the checkbox).
   - ✅ Expected: a detail panel opens showing "Planned Work" (tasks), "Attachments", "Timeline".
2. **Add a step**: click the "+" next to "Planned Work". Fill in a step name, pick a position, optionally toggle "Requires attachment". Submit.
   - ✅ Expected: new step appears in the list.
3. **Complete a step without the attachment requirement**: click the step text (not the checkbox area near delete).
   - ✅ Expected: a "Complete Step" confirm dialog appears → click "Confirm Completion" → step shows as completed with a timestamp.
4. **Complete a step WITH the attachment requirement**: click a step you marked "requires attachment".
   - ✅ Expected: the confirm dialog shows "Attachment Missing" and a file picker; "Confirm Completion" is disabled until you upload a file. Pick any file → button becomes enabled → confirm → step completes.
5. **Delete a step**: hover an incomplete step, click the X that appears.
   - ✅ Expected: step disappears. (Completed steps have no delete button — this is intentional, they're historical records.)
6. **Add an attachment directly**: click the "+" next to "Attachments", pick a file, submit.
   - ✅ Expected: it appears in the attachments list; clicking it opens a preview dialog with a link to the real file.
7. **Timeline**: scroll to the Timeline section.
   - ✅ Expected: you should see entries like "Job order created", "Completed step: ...", "Image uploaded: ..." reflecting everything you just did, newest first.
8. Close the panel (click outside it — this modal has no dedicated close button since the "+" icons live in that corner).

---

## 4. Office Dashboard — Office column ("TODAY — OFFICE") — Reminders

1. Click the **"+"** at the top of the middle (office) column.
2. Fill in: Reminder text (required), Description, Time, Date.
3. Toggle **Urgent** — try both on and off, see the card's color/badge change.
4. Toggle the icon buttons: **Attachment**, **Email**, then enter a phone number, then toggle **Confirm** and **Decline**.
5. Click **ADD TO SCHEDULE**.
   - ✅ Expected: a new reminder card appears in the office column, with the buttons matching what you toggled (call icon, confirm/decline buttons, etc).
6. On the new card, click **Confirm**.
   - ✅ Expected: card's status updates to confirmed.
7. Create another reminder and click **Decline** instead.
   - ✅ Expected: status updates to declined.
8. Dismiss a reminder (the dismiss/X action on the card).
   - ✅ Expected: card disappears from the list entirely.

---

## 5. Worker Dashboard (mobile screen)

1. Log out of the office account.
2. Log in with the **worker's email + the temporary password** you copied in step 3.1.
   - ✅ Expected: you land on the mobile-style field screen (`/dashboard/worker`), not the office dashboard.
3. You should see the job card you created in 3.2, with its checklist.
4. Click a checklist item to mark it complete.
   - ✅ Expected: checkbox fills in, timestamp appears, a toast "Task status updated!" shows briefly.
   - Note: a worker can only mark items complete, not un-complete them — this matches the backend's rules, so there's no way to undo it from here (by design).
5. Click **DETAILS** (bottom-left quick action).
   - ✅ Expected: opens the same detail drawer as Section 3.4, from the worker's side (checklist/attachments/timeline).
6. Click **INFO** (bottom-right quick action).
   - ✅ Expected: a drawer with the job's title, customer/location, and description.
7. Click **MESSAGES**.
   - ✅ Expected: a chat drawer opens. Send a message.
8. Switch back to the office account (log out, log back in as owner) and check the **COMMUNICATION** column.
   - ✅ Expected: the worker's message shows up there as a notification card.
9. Back on the worker screen, click **VOICE** and allow microphone access.
   - ✅ Expected: a recording overlay appears with a live timer.
10. Say something, then click "Stop and send transcript".
    - ✅ Expected: a toast "Voice message sent!" appears, and a new message shows in the chat drawer with an "AI TRANSCRIPT" tag — its text should be the real transcription of what you said (this is the one feature that needs your own browser session to prove out end-to-end, since it depends on real network access to Deepgram).
11. Check the office COMMUNICATION column again — the voice message notification should appear there too, correctly labeled "Voice message" (not "Text message").

---

## 6. Cross-check: does the office see everything live?

The office dashboard refreshes reminders/notifications/summary every 30
seconds automatically, and the worker screen refreshes its unread-message
count every 30 seconds too. To confirm this without waiting:
1. Leave the office dashboard open in one browser tab, worker dashboard logged in on another (or a private/incognito window).
2. Send a message or complete a checklist item from the worker tab.
3. Wait up to 30 seconds on the office tab without refreshing.
   - ✅ Expected: the new notification / updated checklist count appears on its own.

---

## 7. Multi-tenancy (data isolation between companies)

1. Register a **second, completely separate company** (different email) — either in an incognito window or after logging out.
2. Add a worker and a job under this second company.
3. Confirm this second office dashboard shows **only its own** jobs/workers/reminders — nothing from the first company you registered.
4. This is also enforced server-side (not just hidden in the UI) — there's no way to see another company's data even by guessing IDs, but visually confirming the dashboards stay separate is the easy check here.

---

## 8. Platform Admin dashboard

This is a separate, internal-only account type — not something a normal customer signs up for.

1. In a terminal, run (from the project root, with your dev server's `.env.local` in place):
   ```
   node --env-file=.env.local scripts/create-platform-admin.mjs youradmin@example.com SomePassword123!
   ```
2. Go to `/login` and sign in with that email/password.
   - ✅ Expected: you land on `/admin`, not the office dashboard.
3. You should see a table of every company that's ever registered, with module, active/inactive status, user count, job count.
4. Click the status badge on any row.
   - ✅ Expected: toggles between Active/Inactive immediately.
5. Click anywhere else on a row.
   - ✅ Expected: a detail panel opens listing that company's users (name, email, role, active status).

---

## 9. Known, intentional limitations (not bugs)

- The EN/SL language toggle is temporary, for your review only — it'll be removed before this ships.
- Drag-and-drop reordering of checklist steps is visual only in this session; it doesn't persist to the server (there's no reorder endpoint by design).
- The office reminder's "Attachment" toggle when creating a reminder is a UI flag only, not a real file upload — reminders aren't tied to a specific job the way checklist attachments are.
- The "CALL" / "EMAIL" quick actions on the worker screen use placeholder contact details — there's no real office phone/email stored per company yet.
- A worker can mark a checklist step complete but never un-complete it — that's an intentional backend rule, not a missing feature.
