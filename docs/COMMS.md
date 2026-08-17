# Communications v2

This document describes the current messaging, voice-note, transcription, realtime, notification, push, sound, and offline text behavior in `pom-be`.

## Architecture

Job communication is job-scoped. The authoritative message table is `public.job_messages`; every UI surface reads or derives from that table.

The runtime split is:

- Next.js API routes validate access, persist messages, mark reads, create timeline rows, create in-app notifications, and enqueue push delivery jobs.
- Supabase Realtime syncs active chat sessions and the office communication feed.
- `notification_delivery_jobs` is a durable Web Push outbox.
- `workers/push-delivery-worker.ts` is the primary push processor.
- IndexedDB stores offline text messages until the browser reconnects.

Messages, in-app notifications, push jobs, timeline events, audio files, and offline queue rows are separate concerns. A failure in notification/push delivery must not roll back message creation.

## Schema

Base message fields are created in `supabase/migrations/0001_init.sql`. Communications v2 fields are added in `supabase/migrations/0018_communications_v2.sql`.

Important `job_messages` fields:

- `id`
- `company_id`
- `job_id`
- `sender_id`
- `recipient_id`
- `message_type`: `text | voice | system`
- `content`: nullable for pending/failed voice transcription
- `attachment_id`: points to `job_files.id` for voice audio
- `is_urgent`
- `read_at`
- `office_hidden_at`
- `client_message_id`: client idempotency key for text sends
- `transcription_status`: `pending | processing | completed | failed | not_applicable`
- `transcription_error`
- `transcribed_at`
- `created_at`

Idempotency:

- Unique index on `(sender_id, client_message_id)` where `client_message_id is not null`.
- API-level duplicate handling also checks company/job/sender/client id and returns the existing row.

Push tables:

- `push_subscriptions`: one row per browser/device subscription.
- `notification_delivery_jobs`: durable outbox rows with `pending | processing | retry | delivered | failed | cancelled`.

## Routing And Access

Text and voice use the same recipient rule:

- Worker sends to the company office contact.
- Owner/manager sends to the job's assigned worker.
- Workers cannot choose a recipient.
- Office users cannot message a job without an assigned worker.

Implemented in:

- `src/app/api/jobs/[id]/messages/route.ts`
- `src/app/api/jobs/[id]/voice-message/route.ts`
- `src/lib/services/officeContact.ts`

Both routes call `loadJobWithAccess`, so users can only access jobs in their company and role scope.

New message creation is date-gated by `assertJobCommunicationAllowed` in `src/lib/services/jobCommunication.ts`. Reading history and playing old audio remain allowed.

## Message API

### GET `/api/jobs/[id]/messages`

Query params:

- `limit`: default `40`, clamped by `clampMessageLimit`.
- `cursor`: encoded `created_at + id` cursor from the previous page.

Response:

```json
{
  "messages": [],
  "nextCursor": null,
  "hasMore": false
}
```

The DB query reads newest-first for stable cursor pagination, then reverses the returned page so UI receives ascending chronological messages.

### POST `/api/jobs/[id]/messages`

Request:

```json
{
  "content": "message text",
  "is_urgent": false,
  "client_message_id": "uuid"
}
```

Behavior:

- Validates non-empty `content` up to `LIMITS.MESSAGE_MAX_LENGTH`.
- Applies routing and date guard.
- If `client_message_id` already exists for the same sender/job/company, returns the existing message.
- Inserts `message_type = "text"` and `transcription_status = "not_applicable"`.
- Creates `message_sent` timeline event.
- Creates one direct-recipient `message_received` in-app notification.
- Builds a Web Push payload and inserts one `notification_delivery_jobs` row.
- Returns `201 { message }`.

## Shared Client Hook

Active chat state is centralized in `src/hooks/useJobMessages.ts`.

It provides:

- initial latest-page load
- cursor `loadOlder`
- Supabase Realtime subscription to `INSERT` and `UPDATE` for the active job
- merge/dedupe by server `id`, then `client_message_id`
- optimistic text sends
- `sending | sent | failed | queued` local delivery states
- read marking via `PATCH /api/jobs/[id]/messages/read`
- reconnect/focus reconciliation
- offline text queue drain

The merge helper is `src/lib/communications/mergeMessages.ts`.

## Realtime Flow

The chat hook opens a Supabase channel named `job:{jobId}` and listens to `job_messages` inserts and updates for that job.

On `INSERT`:

- Merge the new row into local messages.
- Replace optimistic rows when `client_message_id` matches.
- Fire `onInboundMessage` for messages from another sender.

On `UPDATE`:

- Merge the updated row into local messages.
- Voice transcription updates replace the existing bubble content/status.

On reconnect, browser focus, or network restoration:

- Drain queued offline text messages first.
- Refetch latest messages.
- Let server idempotency resolve any duplicate delivery attempts.

## Office UI

Main file: `src/app/dashboard/office/page.tsx`.

The reply popup uses `useJobMessages`.

Allowed behavior:

- Load latest messages when a job is selected.
- Load older pages via cursor.
- Send optimistic text replies.
- Retry failed optimistic sends with the same `client_message_id`.
- Send voice replies through `/api/jobs/[id]/voice-message`.
- Play voice audio with `VoiceMessagePlayer`.
- Show transcription states from `transcription_status`.
- Show an offline banner when `navigator.onLine === false`.

KOMUNIKACIJA feed:

- Data source is `GET /api/office/communications?date=YYYY-MM-DD`.
- The page subscribes to realtime `job_messages` changes and invalidates/refetches the communication feed.
- It does not use chat polling for normal message delivery.

Hiding a communication:

- `PATCH /api/office/communications/[id]`
- Sets `job_messages.office_hidden_at`.
- Does not delete the message and does not hide it from the job thread.

## Worker UI

Main file: `src/app/dashboard/worker/page.tsx`.

The chat popup uses `useJobMessages`.

Allowed behavior:

- Open chat from query params: `/dashboard/worker?job=<jobId>&chat=open&message=<messageId>`.
- Load latest messages and older cursor pages.
- Mark inbound messages read when the chat opens.
- Send optimistic text messages.
- Retry failed text messages with the same `client_message_id`.
- Queue text messages in IndexedDB while offline.
- Send voice messages online only.
- Play voice audio with `VoiceMessagePlayer`.
- Show transcription states from `transcription_status`.
- Show a push notification opt-in banner and bell toggle.

The worker page still has lightweight background checks for job assignment and notification badges. Chat delivery itself is handled by realtime plus reconciliation, not message polling.

## Voice Messages

Recorder code is in `src/hooks/useVoiceRecorder.ts`.

Recorder states:

- `idle`
- `recording`
- `paused`
- `saving`

Behavior:

- Uses `navigator.mediaDevices.getUserMedia({ audio: true })`.
- Uses `MediaRecorder`.
- Prefers `audio/webm;codecs=opus`, falls back to `audio/webm`, then browser default.
- Supports pause/resume where the browser supports it.
- Timer counts active recording time only.
- Auto-finishes at `LIMITS.VOICE_MAX_SECONDS`.

### POST `/api/jobs/[id]/voice-message`

Request:

- Multipart form data.
- Field: `audio`.

Behavior:

- Validates access/date/size.
- Reads audio into a `Buffer`.
- Computes SHA-256 file hash for idempotency.
- Reuses an existing voice message when the same audio hash already exists for the job.
- Uploads audio to Supabase Storage.
- Inserts `job_files` with `attachment_type = "audio"`.
- Inserts `job_messages` with:
  - `message_type = "voice"`
  - `content = null`
  - `attachment_id = fileRecord.id`
  - `transcription_status = "pending"`
- Enqueues in-app notification and push job with generic voice copy.
- Returns immediately with `201 { message }`.
- Runs transcription after the response with `after()` from `next/server`.

### Transcription State Machine

Background finalization:

1. Update message to `transcription_status = "processing"`.
2. Call Deepgram.
3. On transcript:
   - set `content = transcript`
   - set `transcription_status = "completed"`
   - set `transcribed_at`
   - clear `transcription_error`
4. On failure:
   - keep `content = null`
   - set `transcription_status = "failed"`
   - set `transcription_error`
5. Create `voice_message_transcribed` timeline event.

UI state:

- `pending`: "Prepis se pripravlja..."
- `processing`: "Prepisovanje..."
- `completed`: render transcript content
- `failed`: "Prepis ni na voljo"

Voice playback is independent from transcription; if `attachment_id` exists, audio can be played even when transcription is pending or failed.

## Deepgram

Runtime code is `src/lib/integrations/deepgram.ts`.

Current query:

```text
model=nova-3&detect_language=true&punctuate=true&smart_format=true&diarize=false
```

Behavior:

- Requires `DEEPGRAM_API_KEY`.
- Uses `DEEPGRAM_API_URL`, defaulting to Deepgram listen endpoint.
- Accepts only `audio/*` content types.
- Uses a 30 second timeout.
- Sends the Node `Buffer` directly.
- Returns transcript text on success.
- Returns `null` on missing key, empty audio, unsupported content type, non-2xx, timeout, network error, or empty transcript.
- Logs Deepgram failures with structured `console.error`.

There is no OpenAI voice cleanup/post-processing in the runtime path.

## Voice Playback

Shared playback component:

- `src/components/dashboard/VoiceMessagePlayer.tsx`

Behavior:

- Accepts `attachmentId`.
- Fetches a signed URL from `GET /api/files/{attachmentId}`.
- Caches signed URLs in memory.
- Shows loading/error states.
- Renders `<audio controls autoPlay>` when active.

Used by both office and worker chat popups. `OfficeCard` also has inline KOMUNIKACIJA playback behavior.

## In-App Notifications

Notification helpers live in `src/lib/services/notifications.ts`.

Helpers:

- `notifyUser`
- `notifyMessageReceived`

Behavior:

- Best-effort only.
- Insert failures are logged and do not roll back the message.
- Message notifications are direct-recipient only.
- Office KOMUNIKACIJA does not fan out notification rows to every manager because it reads `job_messages`.

APIs:

- `GET /api/notifications`
- `PATCH /api/notifications/[id]`

Unread count:

- `GET /api/messages/unread-count`
- Counts unread `job_messages` for the current user.

Mark read:

- `PATCH /api/jobs/[id]/messages/read`
- Marks unread messages for the current user within one job.

## Web Push

Client files:

- `src/hooks/usePushNotifications.ts`
- `src/lib/push/client/register.ts`
- `src/lib/push/client/subscribe.ts`
- `public/sw.js`

Server files:

- `src/app/api/push/subscribe/route.ts`
- `src/lib/notifications/payloads.ts`
- `src/lib/notifications/deliveryJobs.ts`
- `src/lib/push/server/processDelivery.ts`
- `src/lib/push/server/sendPush.ts`
- `src/lib/push/server/retry.ts`
- `workers/push-delivery-worker.ts`

Required env vars:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Client behavior:

- Existing subscriptions are reconciled silently on authenticated startup.
- Browser permission is requested only from explicit user action.
- Worker UI exposes a push opt-in banner and bell toggle.
- Logout calls backend unsubscribe for the current device before clearing auth cookies.

Service worker behavior:

- Shows notifications with `public/pomocnik-logo.png` as icon/badge.
- Click route is `payload.data.url`.
- Focuses an existing window where possible, otherwise opens a new one.

Push payload URL:

```text
/dashboard/worker?job=<jobId>&chat=open&message=<messageId>
```

## Push Worker And Retry Strategy

Start worker:

```bash
npm run push-worker
```

Worker entrypoint:

- `workers/push-delivery-worker.ts`

Processing:

1. Poll `claim_notification_delivery_jobs`.
2. Claim due `pending`/`retry` jobs atomically.
3. Load active push subscriptions for the recipient.
4. Send the same payload to all active devices.
5. Delete expired subscriptions on Web Push `404`/`410`.
6. Mark job `delivered` when all eligible sends complete.
7. Mark job `retry` with bounded backoff for transient failures.
8. Mark job `failed` after max attempts or non-transient failure.
9. Mark job `cancelled` when the recipient has no active subscriptions.

Retry constants are in `src/lib/push/server/retry.ts`.

Vercel Cron is not the primary push processor. It can be added later as a backup sweeper, but closed-app message notifications depend on the dedicated worker for seconds-level delivery.

## Offline Text Queue

Offline queue code:

- `src/lib/communications/offlineQueue.ts`
- `src/hooks/useJobMessages.ts`

Storage:

- IndexedDB database: `pomocnik-comms`
- Object store: `queued_text_messages`
- Key: `clientMessageId`
- Index: `[jobId, userId]`

Behavior:

- Text only.
- Voice messages remain online-only.
- If browser is offline, `sendText` creates a local optimistic message with `delivery_state = "queued"` and stores it in IndexedDB.
- Both office and worker chat popups show an offline banner.
- On reconnect/focus, queued messages are sent in order.
- The same `client_message_id` is reused for retry/idempotency.
- On server success, the queued IndexedDB row is deleted and the optimistic row is replaced by the server row.
- If a queued send fails because the browser goes offline again, it stays queued.
- If it fails while online, it becomes `failed` and can be retried by the UI.

## Push Sounds

Sounds are browser-only and implemented in `src/lib/playMessageBeep.ts`.

Behavior:

- Uses Web Audio API.
- Generates a short sine-wave beep.
- `unlockMessageBeep()` runs after first pointer interaction.
- `playMessageBeep()` ignores failures because browsers may block audio.

Office:

- Plays a beep when realtime communication updates indicate inbound activity and the sender is not the current user.

Worker:

- Plays a beep for new inbound chat messages and assigned job/notification changes.

These sounds are separate from Web Push. They only work while the app page is open and browser audio is unlocked.

## Timeline Integration

Text messages:

- Create `message_sent` timeline event in `POST /api/jobs/[id]/messages`.

Voice messages:

- Do not create `message_sent`.
- Background transcription finalization creates `voice_message_transcribed`.

Notification hides:

- Can create `notification_deleted`.

Timeline rendering is handled by `src/lib/timeline/describe.ts` and worker detail mapping in `src/components/dashboard/WorkerDetailModal.tsx`.

## Limits

Defined in `src/config/constants.ts`:

- `MESSAGE_MAX_LENGTH = 400`
- `VOICE_MAX_SECONDS = 15`
- `VOICE_MAX_BYTES = 5 * 1024 * 1024`

## Current Caveats

- Office KOMUNIKACIJA feed is still fetched from its API after realtime invalidation; the realtime event is not used as the final enriched feed row.
- Worker page still has lightweight polling for job assignment/notification badges. Chat messages themselves use realtime and reconciliation.
- Offline queue is text-only. Voice is intentionally online-only for launch.
- Push delivery requires a running dedicated worker process; Vercel alone will not process `notification_delivery_jobs`.
- Web Push depends on user/browser permission and active subscriptions, so delivery is best-effort even though the outbox is durable.

## Non-Goals

- Group chat
- Typing indicators
- Message editing/deleting
- Reactions
- Read receipts per participant beyond `read_at`
- Offline voice messages
- Streaming transcription
- Push delivery from Vercel Cron as the primary path
