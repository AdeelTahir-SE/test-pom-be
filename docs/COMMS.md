# Communications Implementation

This document describes the current messaging, voice-note, transcription, notification, and sound behavior in the app. It is based on the current code in `src/app`, `src/lib`, `src/hooks`, and `src/components`.

## Core Model

Communications are job-scoped. The source of truth for chat messages is `public.job_messages`.

Relevant schema is created in `supabase/migrations/0001_init.sql`:

- `job_messages.company_id`
- `job_messages.job_id`
- `job_messages.sender_id`
- `job_messages.recipient_id`
- `job_messages.message_type`
- `job_messages.content`
- `job_messages.is_urgent`
- `job_messages.attachment_id`
- `job_messages.read_at`
- `job_messages.created_at`

Voice messages store their audio file in `public.job_files`; the corresponding `job_messages.attachment_id` points at that file.

`office_hidden_at` is added in `supabase/migrations/0014_message_office_hidden.sql`. It is used only to hide a message from the shared office communication feed. It does not delete the message and does not hide it from the job chat thread.

Notifications are stored separately in `public.notifications`. They are lightweight delivery records, not the message source of truth.

## Access And Routing Rules

Text and voice messages use the same asymmetric routing rule:

- Worker sends to the company office contact.
- Owner/manager sends to the assigned worker for that job.
- Workers cannot choose a recipient.
- Office users cannot message a job without an assigned worker.

This is implemented in:

- `src/app/api/jobs/[id]/messages/route.ts`
- `src/app/api/jobs/[id]/voice-message/route.ts`
- `src/lib/services/officeContact.ts`

Both text and voice sending call `loadJobWithAccess`, so users can only interact with jobs they are allowed to access.

New messages are date-gated by `assertJobCommunicationAllowed` in `src/lib/services/jobCommunication.ts`. New text/voice communication is allowed only for the job's current board day. Reading history and playing old voice messages remain allowed.

## Text Messages

### Load Thread

`GET /api/jobs/[id]/messages`

Implemented in `src/app/api/jobs/[id]/messages/route.ts`.

Behavior:

- Authenticated and job-access checked.
- Returns all messages for the job.
- Ordered by `created_at ASC`.
- Response shape is `{ messages }`.

### Send Text

`POST /api/jobs/[id]/messages`

Request body:

```json
{
  "content": "message text",
  "is_urgent": false
}
```

Behavior:

- Validates `content` as non-empty and max `LIMITS.MESSAGE_MAX_LENGTH`.
- Applies the asymmetric recipient rule.
- Applies the communication date guard.
- Inserts a `job_messages` row with `message_type = "text"`.
- Creates a `message_sent` timeline event.
- Creates one `message_received` notification for the direct recipient.
- Returns `201 { message }`.

Text message notification body is the first 100 characters of the message.

## Voice Messages

### Recorder

The shared recorder hook is `src/hooks/useVoiceRecorder.ts`.

State machine:

- `idle`
- `recording`
- `paused`
- `saving`

Behavior:

- Uses `navigator.mediaDevices.getUserMedia({ audio: true })`.
- Uses `MediaRecorder`.
- Preferred MIME type order:
  - `audio/webm;codecs=opus`
  - `audio/webm`
  - browser default fallback
- Supports pause/resume when the browser supports `MediaRecorder.pause()` and `MediaRecorder.resume()`.
- Timer counts active recording time only.
- Auto-finishes when `LIMITS.VOICE_MAX_SECONDS` is reached.
- Current limit is 15 seconds in `src/config/constants.ts`.
- Empty audio triggers an `empty-audio` error.

### Send Voice

`POST /api/jobs/[id]/voice-message`

Implemented in `src/app/api/jobs/[id]/voice-message/route.ts`.

Request shape:

- Multipart form data.
- Field name: `audio`.

Behavior:

- Authenticated and job-access checked.
- Applies the communication date guard.
- Validates audio exists.
- Rejects files above `LIMITS.VOICE_MAX_BYTES`.
- Applies the same asymmetric recipient rule as text messages.
- Reads the uploaded audio into a `Buffer`.
- Computes SHA-256 hash.
- Checks for an existing `job_files` row with the same `job_id` and `file_hash`.
- If an existing file and voice message exist, returns the existing message instead of creating a duplicate.
- Uploads the audio to Supabase Storage.
- Inserts a `job_files` row with `attachment_type = "audio"`.
- Inserts a `job_messages` row with:
  - `message_type = "voice"`
  - `content = "Voice message (untranscribed)"`
  - `attachment_id = fileRecord.id`
- Schedules transcription with `after()` from `next/server`.
- Sends one immediate notification with title `New voice message`.
- Returns immediately with `201 { message }`.

Voice creation intentionally does not wait for transcription.

### Transcription

Transcription is implemented in `src/lib/integrations/deepgram.ts`.

Current Deepgram request:

```text
model=nova-3&language=sl&punctuate=true&smart_format=true&diarize=false
```

Runtime behavior:

- Requires `DEEPGRAM_API_KEY`.
- Uses `DEEPGRAM_API_URL`, defaulting to `https://api.deepgram.com/v1/listen`.
- Accepts only `audio/*` content types.
- Uses a 30 second timeout.
- Sends the Node `Buffer` directly as the fetch body.
- Returns the transcript string on success.
- Returns `null` on missing key, empty audio, unsupported content type, Deepgram non-2xx, timeout, network error, or empty transcript.
- Logs failures through structured `console.error`.

The background finalization flow:

1. `finalizeVoiceTranscription` calls `transcribeAudio`.
2. If a transcript is returned, it updates the same `job_messages.content`.
3. It creates a `voice_message_transcribed` timeline event.
4. If transcription fails, the original fallback text remains in `job_messages.content`, but the timeline event still records `transcribed: false`.

There is no OpenAI voice post-processing in the voice message path.

## Voice Playback

Playback UI is shared through `src/components/dashboard/VoiceMessagePlayer.tsx`.

Behavior:

- Accepts a `job_files` `attachmentId`.
- Fetches a signed URL from `GET /api/files/{attachmentId}`.
- Caches signed URLs in an in-memory `Map`.
- Renders a speaker button.
- Shows loading state while fetching the URL.
- Renders `<audio controls autoPlay>` when active.
- Shows inline error text if signed URL fetch fails.

`OfficeCard` uses `useVoicePlaybackController` directly so voice cards in the KOMUNIKACIJA column can play inline.

Chat popups in both `/dashboard/office` and `/dashboard/worker` render `VoiceMessagePlayer` for voice messages with `attachment_id`.

## Office UI

Main file: `src/app/dashboard/office/page.tsx`.

### Board Data

`/office` uses `useOfficeBoard` from `src/hooks/useOfficeBoard.ts`.

Important queries:

- `/api/jobs`
- `/api/office-reminders`
- `/api/notifications`
- `/api/office/communications`
- `/api/users`
- `/api/jobs/checklists`
- `/api/office/summary`

Polling:

- Notifications refetch every 30 seconds.
- Office communications refetch every 15 seconds.

### KOMUNIKACIJA Column

The shared office communication feed comes from:

`GET /api/office/communications?date=YYYY-MM-DD`

Implemented in `src/app/api/office/communications/route.ts`.

Behavior:

- Workers are forbidden.
- Requires a date query param.
- Reads `job_messages`.
- Filters out rows with `office_hidden_at`.
- Filters messages to the selected app calendar day.
- Enriches rows with:
  - job title
  - assigned worker ID/name
  - sender name
  - recipient name
  - attachment ID
- Returns `{ messages }`.

The office feed is mapped into dashboard cards by `communicationToMessage` in `src/lib/dashboardMappers.ts`.

### Office Reply Popup

Opening a reply popup:

- `handleOpenReply(jobId)` loads `/api/jobs/{jobId}/messages`.
- Messages render oldest to newest.
- Voice messages show playback controls and transcript/fallback text.

Sending text:

- `handleSendReply` posts to `/api/jobs/{replyJobId}/messages`.
- On success, appends the returned message and refreshes the board.

Sending voice:

- `handleVoiceReplyComplete` posts multipart audio to `/api/jobs/{replyJobId}/voice-message`.
- On success, appends the returned placeholder message.
- Schedules follow-up refreshes at 1s, 2.5s, 5s, 10s, 20s, and 32s.
- Those refreshes reload the open thread and refresh the board so the async transcript replaces the placeholder when available.

The office recording dialog uses the shared recorder hook and shows pause/resume/finish controls.

### Hiding Office Communications

`PATCH /api/office/communications/[id]`

Implemented in `src/app/api/office/communications/[id]/route.ts`.

Behavior:

- Office-only.
- Sets `job_messages.office_hidden_at`.
- Does not delete the message.
- Does not hide it from the job chat thread.

## Worker UI

Main file: `src/app/dashboard/worker/page.tsx`.

### Initial Data

Worker dashboard loads:

- `/api/jobs`
- active job checklist
- active job messages
- `/api/messages/unread-count`
- `/api/notifications`

Only the active/open job for the selected worker day is displayed.

### Chat Popup

Opening chat:

- Sets chat open.
- Calls `PATCH /api/jobs/{job.id}/messages/read`.
- Resets local unread count.

Sending text:

- `handleSendMessage` posts to `/api/jobs/{job.id}/messages`.
- On success, appends the returned message locally.

Sending voice:

- `handleVoiceComplete` posts multipart audio to `/api/jobs/{job.id}/voice-message`.
- On success, appends the returned placeholder message.
- Schedules thread refreshes at 1s, 2.5s, 5s, 10s, 20s, and 32s so the async transcript replaces the placeholder.

Message polling:

- Runs every 15 seconds.
- Checks unread count, notifications, jobs, and active job messages.
- Message comparison checks length, order, `content`, `read_at`, and `attachment_id`, so async transcription content changes are picked up.

Voice messages in the worker chat render playback controls and the transcript/fallback text.

## Notifications

Notification creation lives in `src/lib/services/notifications.ts`.

Two helpers exist:

- `notifyUser`
- `notifyMessageReceived`

Design:

- Notifications are best-effort.
- Insert failures are logged but do not roll back the message/job operation.
- Message notifications are direct-recipient only.
- The shared office communication column does not require fan-out notifications to every manager because it reads `job_messages` directly.

Notification APIs:

- `GET /api/notifications`
- `PATCH /api/notifications/[id]`

`GET /api/notifications` returns the current user's visible notifications only, ordered newest first.

`PATCH /api/notifications/[id]` can:

- set `is_read = true`
- set `hidden_at`

When hiding a job-linked notification, the API also creates a `notification_deleted` timeline event.

## Unread Counts

`GET /api/messages/unread-count`

Implemented in `src/app/api/messages/unread-count/route.ts`.

Counts unread `job_messages` where:

- `company_id = auth.companyId`
- `recipient_id = auth.userId`
- `read_at is null`

This is global, not job-scoped.

`PATCH /api/jobs/[id]/messages/read`

Implemented in `src/app/api/jobs/[id]/messages/read/route.ts`.

Marks unread messages as read for the current user within one job.

## Push Sounds

Sounds are browser-only and implemented in `src/lib/playMessageBeep.ts`.

Behavior:

- Uses Web Audio API.
- Generates a short sine-wave beep.
- No audio asset file is required.
- `unlockMessageBeep()` is called after the first pointer interaction to reduce autoplay blocking.
- `playMessageBeep()` ignores failures because browsers may still block audio.

Office:

- Unlocks audio on first pointer down.
- Plays a beep when a new inbound communication appears in the polled communication feed.
- Does not beep for messages sent by the current user.

Worker:

- Unlocks audio on first pointer down.
- Polls unread count, notifications, jobs, and active job messages.
- Plays a beep for new assigned jobs or new inbound messages.

This is not native push notification. It is in-page polling plus a local beep.

## Timeline Integration

Text messages create a `message_sent` timeline event in `POST /api/jobs/[id]/messages`.

Voice messages do not create `message_sent`; instead, background finalization creates `voice_message_transcribed`.

Notification hides can create `notification_deleted`.

Timeline rendering describes voice events in `src/lib/timeline/describe.ts`, and worker detail timeline maps `voice_message_transcribed` to a voice timeline item.

## Limits And Configuration

Message and voice limits are centralized in `src/config/constants.ts`:

- `MESSAGE_MAX_LENGTH = 400`
- `VOICE_MAX_SECONDS = 15`
- `VOICE_MAX_BYTES = 5 * 1024 * 1024`

Deepgram config is in:

- `src/lib/integrations/deepgram.ts`
- `src/lib/env.ts`

Relevant env vars:

- `DEEPGRAM_API_KEY`
- `DEEPGRAM_API_URL`

Current transcription language is explicitly Slovenian via `language=sl`.

## Current Known Caveats

- Voice message content is initially stored as `Voice message (untranscribed)` and later replaced only if Deepgram returns a transcript.
- If Deepgram fails, the placeholder remains in the message content.
- There is no separate transcription status field in `job_messages`; UI infers state from message content.
- The open chat popup relies on scheduled refreshes after sending voice and on background polling after that.
- Office shared communications are day-filtered by message `created_at`, not job scheduled date.
- Hiding a communication in `/office` only sets `office_hidden_at`; the underlying job thread remains intact.
- Notifications are not guaranteed delivery. They are intentionally best-effort.
- Sounds are not system push notifications and only work while the app page is open and browser audio is allowed.
- Voice transcription uses Deepgram only; there is no OpenAI cleanup or post-processing layer in the runtime path.
