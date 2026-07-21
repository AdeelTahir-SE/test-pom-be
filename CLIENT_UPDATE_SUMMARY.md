# Update Summary — Feedback Addressed

Here's a rundown of everything from your feedback, and what's been done in response.

---

**You asked for:** The office dashboard's field, office, and communication columns to show example cards instead of a blank "no cards yet" message, so new users see what a real card looks like. Dismissible, and reappearing the next day if the column is still empty.
**We did:** Done — each column now shows a filled-in example card until you add a real one or dismiss it, and it comes back the following day if you haven't added anything yet.

**You asked for:** The field column to only have a "+" to add a card, with no separate "add worker" button there — that belongs in Settings instead.
**We did:** Done — the field column now only has the "+" to add a job. Adding a team member now lives inside Team settings, where it makes more sense.

**You asked for:** Card numbers to be a clean per-company sequence (#001, #002...) instead of the internal ID that was showing.
**We did:** Done — every job card now gets its own sequential number, starting at #001 for each company. This number is permanent once assigned (like an invoice number), so it stays a reliable reference even if a card gets moved around later.

**You asked for:** Photos/files attached while completing a step to actually be saved against that step.
**We did:** Done — attachments are now properly linked to the exact step they were added for, and stay linked after closing and reopening the card.

**You asked for:** The "add card" form to be two steps — job info, then a repeatable list of tasks — with "add another task" adding two fields at once, and all entered tasks visible without a cramped scrollbox.
**We did:** Done — rebuilt as a 2-step form matching this exactly, including fixing the card number, worker name, and task-count display bugs you flagged from testing the original version.

**You asked for:** The drag handle on cards and tasks to actually let you reorder things and have it stick.
**We did:** Done, everywhere it appears — job cards, task steps, and office reminder cards can all be dragged into a new order, and it's saved for good, not just visual until the next refresh.

**You asked for:** The activity timeline to show meaningful information — e.g. who a job was actually assigned to, not just "worker assigned" with no name.
**We did:** Done — the timeline now names the actual person assigned, and a couple of entries that were showing as broken raw text are now fixed. Message entries in the timeline also now show a short snippet of what was actually said, so scrolling back through history later is actually useful.

**You asked for:** A confirmation step before deleting a task, since it currently deletes instantly.
**We did:** Done — deleting a task now asks you to confirm first.

**You asked for:** New worker accounts to skip the password field entirely and instead get a short auto-generated login code by email; managers keep a real password.
**We did:** Done and tested — workers get a 3-character code, managers keep the standard password. Email delivery is wired up and working; it'll reach real inboxes once your own sending domain is verified (see "Still open" below).

**You asked for:** The Add Team Member form's exact wording — headline, field labels, spacing, and the email field visually set apart since it's their login.
**We did:** Done — matches the wording and layout you specified.

**You asked for (not explicitly, but worth flagging):** After renaming the role field to "Access" with "Field"/"Office" options, it wasn't obvious that "Office" grants full manager-level access rather than just meaning "an office-based worker" — this caused an accidental manager account to get created during testing.
**We did:** Added a short explanation under that dropdown so it's clear what each option actually grants, without changing the wording you asked for.

**You asked for:** Office should be able to reply to workers from the communication column; the worker's own mobile screen; the owner/manager getting the full dashboard on mobile with swipe navigation between columns.
**We did:** All three were already in place and have been re-confirmed working.

---

## Still open / needs a decision from you

- **Email delivery to real workers** — the system is fully wired and tested, but currently only delivers to our own test address. To have it actually reach your team, you (or whoever manages your domain) need to verify your sending domain with Resend and give us the address to switch to. Until then, everything still works exactly as before — new accounts just show their login details once on screen instead of by email.
