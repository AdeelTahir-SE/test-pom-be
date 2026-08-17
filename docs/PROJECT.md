# FOUNDATION v2
> `This is the original project sepcifications document.`

## PART 1/10 — PLATFORM VISION & CORE ARCHITECTURE (MVP+ LOCKED)

### 0. Platform Purpose

The system is a multi-tenant SaaS platform for coordinating field operations.

It is designed as a universal foundation that supports multiple industries using a single backend architecture.

The platform contains no industry-specific logic. Industry behavior is implemented through **Business Modules**.

### 1. Core Principle

The Foundation provides only shared platform capabilities:

- Authentication
- Multi-tenancy
- Company management
- User management
- Role management
- Jobs (core entity CRUD only)
- Basic messaging (text + attachments only)
- File upload/download (basic storage only)
- Settings (basic configuration only)
- Notifications (optional, simple delivery only)
- Timeline (basic event tracking only)
- Mobile support (UI client only, no backend logic layer)

**STRICT RULE**

Foundation MUST NOT implement:

- industry workflows
- business logic
- state machines
- domain-specific rules

### 2. Business Modules

Every company belongs to exactly one Business Module. A Business Module defines:

- terminology
- onboarding steps
- UI labels
- workflow configuration (UI-level only)
- templates
- validation rules

**IMPORTANT RULE**: Business Modules are configuration only. They do NOT extend backend logic.

### 3. Initial Business Modules

Supported in first release:

- Construction
- Field Service

Planned:

- Cleaning Services
- Installation Companies
- Facility Management
- Landscaping
- Mechanical Workshops
- Logistics
- Moving Services

**RULE**: Adding a new module MUST NOT require changes to Foundation backend or database schema.

### 4. Shared Platform

All Business Modules share the same platform core:

- authentication
- multi-tenancy isolation
- users
- companies
- jobs (single universal table)
- basic messaging
- file uploads
- comments
- attachments

**STRICT SCOPE RULE**: Everything above is shared. Everything else is module-level configuration or UI behavior.

### 5. Universal Job Model

The Foundation operates on a single entity: **Job**.

A Job is a universal work item. The Foundation does NOT understand what a Job represents in real life.

Examples of meaning (handled ONLY by modules/UI):

- Route
- Project
- Intervention
- Cleaning task
- Installation work

**RULE**: All operational data is stored as Job. No separate tables per industry.

### 6. Multi-Tenant Rule

Every company is fully isolated.

Database rule:

```
company_id UUID NOT NULL on all relevant tables
```

**STRICT RULE**

- All queries are tenant-scoped
- No cross-company access
- Company context comes only from authenticated session
- Client cannot override company ownership

### 7. Long-Term Goal

The Foundation is built once. Business Modules are added continuously.

**REALISTIC GOAL**

Most code is shared across industries. Differences are limited to:

- UI labels
- onboarding text
- configuration values

NOT backend behavior.

> ⚠️ **IMPORTANT MVP SAFETY RULE**
> No system described in this document should imply:
> - separate engines
> - pluggable backend modules
> - runtime workflow systems
> - dynamic backend behavior injection
>
> Everything remains static backend + configurable frontend.

---

## PART 2/10 — BUSINESS MODULE SYSTEM (MVP+ LOCKED FIXED)

### 8. Business Module Loader

Each company has exactly ONE business module.

Database:

```
companies.business_module TEXT NOT NULL
```

Allowed values:

- construction
- field_service
- cleaning
- installation
- facility_management
- logistics
- moving

**RULE**: Module is only a string used to select frontend configuration. Backend does NOT interpret module meaning.

### 9. Module Immutability

Business module is set once at registration.

**RULE**

- cannot be changed in UI
- no admin tools
- no migration flow in application

If mistake happens → DB fix is done manually by developer.

**WHY THIS EXISTS**

Business module affects:

- initial job structure
- default statuses
- onboarding flow
- historical interpretation of jobs

Changing it after creation would make existing data inconsistent.

### 10. Module Responsibility

Each module defines only configuration data:

- UI labels (text)
- onboarding steps (text)
- default job wording (text)
- default job statuses and checklist templates (as data presets)

**STRICT RULE**

Modules MUST NOT:

- change backend behavior
- introduce backend logic
- define workflows in backend
- extend system capabilities

Modules are ONLY configuration inputs for frontend + initial data seeding.

### 11. Module Isolation

Foundation backend is identical for all modules.

**FORBIDDEN**

- authentication changes
- permission changes
- database schema changes
- session handling changes

**CORE RULE**: All modules share identical backend behavior. Only configuration differs.

### 12. Registration Flow (Simple MVP)

Register company:

- email + password
- company name
- select business module

**BACKEND RULE (IMPORTANT SAFETY GUARD)**

- Backend MUST validate that selected `business_module` exists in the allowed values list before creating the company.

**FLOW**

1. validate module
2. create user + company in one request
3. store business_module
4. create session

Done.

### 13. Future Modules

Adding a new industry = add new frontend JSON configuration file.

**RULE**: No backend changes required. No database schema changes required.

---

## PART 3/10 — TERMINOLOGY SYSTEM (FINAL CLEAN)

### 14. Core Principle

Backend NEVER cares about industry language. Frontend handles all UI text.

### 15. Universal Model (Backend Only)

Backend only knows universal entities:

- job
- worker
- owner
- dispatcher
- comment
- attachment

No translations exist in backend.

### 16. Terminology (Frontend Only)

Each Business Module is a static JSON file:

```
/modules/logistics.json
/modules/construction.json
```

Example:

```json
{
  "job": "Job",
  "worker": "Worker",
  "create_job": "Create job",
  "status_new": "New",
  "status_done": "Done"
}
```

or

```json
{
  "job": "Vožnja",
  "worker": "Voznik",
  "create_job": "Ustvari vožnjo",
  "status_new": "Novo",
  "status_done": "Dostavljeno"
}
```

**RULE**

- loaded once on app start
- stored in memory
- used directly in UI

NO API calls for labels.

### 17. Frontend Rule

Frontend simply does:

```
t("create_job")
```

That's it. No overrides. No merge logic. No DB involvement.

### 18. Backend Rule

Backend returns only:

- job data
- user data
- company data
- business_module string

No labels. No translation.

### 19. Module Job Structure (Important MVP Addition)

Each Business Module MUST ALSO define default job structure presets used on company creation. This includes:

- default job statuses
- default checklist templates

Example (conceptual, not stored in backend logic):

**Construction**: New → Waiting for materials → In progress → Done

**Logistics**: Planned → In transit → Delivered

**RULE**

- Backend does NOT interpret meaning
- Backend only stores preset values provided during setup
- These presets are applied once at company creation

### 20. Registration Validation (Important MVP Safety)

During registration backend MUST validate:

- business_module exists in allowed list

If invalid → reject request (400 Bad Request)

Allowed list: construction, field_service, cleaning, installation, facility_management, logistics, moving

### 21. Module Loading Flow

1. user logs in
2. backend returns company + business_module
3. frontend loads `/modules/{module}.json`
4. frontend loads default job structure from same module file
5. UI uses static translations + preset statuses

### 22. MVP Benefit

This system guarantees:

- 1 backend
- 1 database
- 1 frontend
- zero complexity layer
- fast development (MVP-ready)

---

## PART 4/10 — UNIVERSAL FILE INFRASTRUCTURE

*(Foundation v1.0)*

### 4. Purpose

File Infrastructure is a shared Foundation service used by all Business Modules. It is responsible ONLY for:

- storing files
- retrieving files

It contains NO business logic. It does NOT know:

- what industry is used
- what a Job means in real life
- any workflow meaning

It only knows:

- file belongs to a job_id
- file belongs to a company_id

**Supported File Types**

- Images
- PDF documents
- Voice recordings
- Basic document files (doc, txt)

No other restrictions at application level. Future formats can be added without changing backend architecture.

**Upload Rules**

Maximum file size: 5 MB per file

**Image Handling Rule**

Before storing images, system MUST automatically:

- compress image
- generate thumbnail
- strip metadata (EXIF removal required)

Removed metadata includes:

- GPS location
- device info
- camera info
- timestamps embedded in image

Reason: Privacy + storage optimization

**Storage Structure**

MVP storage path:

```
/company_id/file.ext
```

No folder hierarchy. No categorization system.

**Universal File Model**

Table: `files`

| Field | Type |
|---|---|
| id | UUID PRIMARY KEY |
| company_id | UUID NOT NULL |
| job_id | UUID NULL |
| uploaded_by | UUID NOT NULL |
| file_type | TEXT NOT NULL |
| storage_path | TEXT NOT NULL |
| created_at | TIMESTAMPTZ NOT NULL |

**RULE**: Database stores ONLY metadata. Actual files are stored in object storage.

**Tenant Isolation (Critical Rule)**

A file is accessible ONLY if:

```
session.company_id == file.company_id
```

**Strict Security Rule**

Even if someone guesses a file URL → they MUST NOT access another company's file. This must be enforced at storage level, not frontend. Frontend is NOT a security boundary.

**Business Module Usage**

All Business Modules use the same file system. Examples:

- Construction: site photos, plans, documents
- Field Service: equipment photos, customer reports
- Cleaning: before/after photos
- Logistics: delivery proof, signed documents

**IMPORTANT RULE**: File system NEVER changes per module. Only file usage context changes.

**System Guarantee**

File Infrastructure is complete only if:

- ✔ secure uploads work
- ✔ images are compressed
- ✔ metadata is removed
- ✔ thumbnails are generated
- ✔ tenant isolation is enforced
- ✔ images, PDFs, voice files supported
- ✔ same behavior for all modules

**MVP Note (Important)**

No:

- file tagging system
- file permissions system
- file workflows
- file versioning
- file search engine

These are explicitly OUT of MVP scope.

---

## PART 5/10 — COMMUNICATION INFRASTRUCTURE (MVP+)

*(Foundation v1.0)*

### 5. Purpose

Communication is one of the three core pillars of the platform. Every message is always attached to a Job. There is no standalone company chat. This keeps all communication in context.

### 6. Supported Communication

Foundation supports:

- Text messages
- Voice messages
- Voice-to-text transcription (MANDATORY for voice messages)
- Images
- Documents
- Quick replies
- Read status (simple binary)

Future Business Modules inherit these capabilities automatically.

### 7. Universal Message Model

Table: `job_messages`

| Field | Type |
|---|---|
| id | UUID PRIMARY KEY |
| company_id | UUID NOT NULL |
| job_id | UUID NOT NULL |
| sender_id | UUID NOT NULL |
| message_type | TEXT NOT NULL |
| content | TEXT NULL |
| attachment_id | UUID NULL |
| is_read | BOOLEAN DEFAULT false |
| created_at | TIMESTAMPTZ NOT NULL |

**Message Types & Rules (Fixed)**

Allowed values (CLOSED SET): `text`, `voice`, `image`, `document`, `system`

**RULE**: This is a CLOSED set. No additional types are allowed.

- **text** — Stored directly in content.
- **voice (CORE FEATURE)** — Voice messages are ALWAYS transcribed into text.
  - Audio file stored via attachment_id
  - System MUST generate transcription
  - Resulting text stored in content
  - UI displays transcribed text by default
  - Audio playback is optional
  - IMPORTANT: Voice is NOT a separate message type in UI. It is just a text message with attached audio input.
- **image / document** — Stored via attachment_id only. Files must always be stored through the shared Foundation File Storage. External URLs must never be stored directly.
- **system** — System-generated plain text messages created by backend for job updates (e.g. status change). Displayed as normal messages in the chat stream.

### 8. Quick Replies

Quick replies are frontend UI shortcuts:

- On my way
- Completed
- Need material
- Running late
- Call me

**RULE**: Backend treats them as normal text messages. Localization is handled entirely in frontend module JSON files.

### 9. Read Status

Simple binary model: `is_read = true / false`

**RULE**: When opening a job chat:

- frontend marks all messages from other users as read in ONE bulk request
- no per-message tracking
- no read receipts per user
- no timestamps required for read tracking

### 10. Notifications Boundary

Communication system only:

- stores message in database
- MAY trigger internal hook/event: `MessageCreated` (optional, lightweight hook only)

It does NOT handle delivery. Push/SMS/email is handled by Notification Infrastructure.

### 11. Business Module Usage

Same engine for all industries:

- Construction → site updates + photos
- Field Service → inspection results
- Cleaning → before/after photos
- Logistics → delivery issues

Only terminology differs.

### 12. Definition of Done

Communication Infrastructure is complete only if:

- ✔ Text messages work
- ✔ Voice messages work (with mandatory transcription to text)
- ✔ Images can be attached
- ✔ Documents can be attached
- ✔ Quick replies work
- ✔ Read status works (simple binary)
- ✔ Every message belongs to a Job
- ✔ No standalone chat exists
- ✔ UI shows only unified message stream (no chat modes)

---

## PART 6/10 — JOBS ENGINE (MVP+ LOCKED)

### 6. Purpose

The Jobs Engine is the core operational layer of the platform. Everything in the system revolves around Jobs. A Job represents all work in the field.

### 7. Universal Rule

The Foundation MUST treat all operational work as a single entity: **Job**.

The Foundation MUST NOT distinguish between: route, project, intervention, task, delivery, cleaning job. These are ONLY labels defined by Business Modules. Internally: everything is a Job.

### 8. Universal Job Model

Table: `jobs`

| Field | Type |
|---|---|
| id | UUID PRIMARY KEY |
| company_id | UUID NOT NULL |
| created_by | UUID NOT NULL |
| status | TEXT NOT NULL |
| title | TEXT NOT NULL |
| description | TEXT NULL |
| priority | TEXT NULL |
| scheduled_at | TIMESTAMPTZ NULL |
| started_at | TIMESTAMPTZ NULL |
| completed_at | TIMESTAMPTZ NULL |
| created_at | TIMESTAMPTZ NOT NULL |

**NOTE**: Jobs are assigned through the shared `job_assignments` table. Each Job is assigned to exactly one worker. Each Job therefore has exactly one Daily Work Card and one communication channel. Multiple assigned workers are not supported in the MVP.

**metadata (Important Simplification Rule)**

```
metadata JSONB DEFAULT '{}'
```

**RULE**

ONLY allowed for:

- module-specific UI hints
- extra labels
- non-critical configuration

DO NOT store:

- workflow logic
- status machines
- business rules

### 9. Job Status System (Fixed Core)

Foundation defines ONLY:

- pending
- in_progress
- waiting
- completed
- cancelled

**RULE**

- statuses are universal
- modules may rename labels in UI only
- modules may hide statuses, NOT create new ones

### 10. Job Lifecycle

Standard flow: `created → pending → in_progress → waiting → completed`

Optional override: `cancelled` can happen anytime

### 11. Job Ownership

Each Job belongs to:

- exactly one company
- one creator (Owner or Manager)
- exactly one assigned worker

Cross-company assignment is strictly forbidden.

### 12. Job Content Model

A Job can contain: messages, attachments, checklist items, comments. All are linked via `job_id`. No separate systems.

### 13. Checklist System

Table: `job_checklist_items`

| Field | Type |
|---|---|
| id | UUID PRIMARY KEY |
| job_id | UUID NOT NULL |
| label | TEXT NOT NULL |
| order_index | INTEGER NOT NULL |
| is_completed | BOOLEAN DEFAULT false |
| created_at | TIMESTAMPTZ NOT NULL |

**RULE**: checklist is static data. No workflow engine. No dependencies between items.

### 14. Business Module Extension Points (Clean Version)

Modules may only extend Jobs via:

- UI labels
- metadata JSONB (non-critical only)
- checklist templates (initial generation only)
- validation rules (frontend-level only)

**STRICT RULE**

Modules MUST NOT:

- change job schema
- introduce new tables
- define backend workflow logic
- override status system

### 15. Mobile-First Behavior

Mobile users can:

- view assigned jobs
- open job details
- upload images
- send voice messages
- update job status
- complete job

**RULE**: No complex workflow UI on mobile.

### 16. Dispatcher View

Dispatcher view is ONLY a visualization layer. Kanban board = UI representation of `job.status`.

**RULE**: No separate kanban system exists.

### 17. Business Module Mapping

Example mapping only (UI layer):

- Construction → Site Work
- Field Service → Service Task
- Logistics → Delivery
- Cleaning → Cleaning Task

Backend always remains: Job

### 18. Definition of Done

Jobs Engine is complete only if:

- ✔ Jobs can be created
- ✔ Jobs can be assigned
- ✔ Status updates work
- ✔ Checklist works
- ✔ Jobs support messages
- ✔ Jobs support attachments
- ✔ Mobile can complete jobs
- ✔ Dispatcher sees jobs in board view
- ✔ No industry logic exists in backend
- ✔ No workflow engine exists anywhere

---

## PART 7/10 — MESSAGING + NOTIFICATIONS CORE

### 19. Purpose

This layer defines how the system communicates events to users. It is split into two independent systems:

1. Messaging (job-related communication)
2. Notifications (system alerts)

They are related but NOT the same system.

### 20. Messaging Rule

All messages MUST belong to a Job. There is NO:

- global chat
- company chat
- direct messaging between users outside a Job

Every communication must be contextual.

### 21. Notification System

Notifications are event-based and system-wide. They are generated from: job updates, messages, assignments, system events. But they are NOT tied to message content.

### 22. Notification Model

Table: `notifications`

| Field | Type |
|---|---|
| id | UUID PRIMARY KEY |
| company_id | UUID NOT NULL |
| user_id | UUID NOT NULL |
| type | TEXT NOT NULL |
| title | TEXT NOT NULL |
| body | TEXT NULL |
| job_id | UUID NULL |
| is_read | BOOLEAN DEFAULT false |
| created_at | TIMESTAMPTZ NOT NULL |

### 23. Notification Types

Foundation supports only generic types:

- job_assigned
- job_updated
- message_received
- job_completed
- system_alert

Business Modules may customize notification text in the UI, but MUST use Foundation notification types.

### 24. Delivery Channels

The Foundation DOES NOT define delivery methods. Notifications are delivered via:

- in-app feed (required)
- optional push notifications
- optional email notifications

Delivery mechanism is handled outside this layer.

### 25. Quick Reaction Events

Some notifications are triggered instantly:

- job assigned → notify worker
- message sent → notify assignee
- job completed → notify dispatcher/owner

These rules are universal across all modules.

### 26. Message → Notification Flow

```
User sends message
        ↓
Message stored in job_messages
        ↓
Event emitted: message_received
        ↓
Notification created for relevant users
```

This flow is mandatory and identical for all industries.

### 27. Read State Separation

Messages and Notifications have separate read states:

- Messages → read per job conversation
- Notifications → read per user feed

They MUST NOT share state.

### 28. Business Module Usage

- Construction: "New photo from site" / "Worker updated progress"
- Field Service: "Technician sent report" / "Customer issue updated"
- Logistics: "Driver sent delivery proof" / "Route updated"

Same system. Different meaning only at UI level.

### 29. Anti-Pattern Rule

The Foundation MUST NOT:

- implement chat rooms
- implement threaded social messaging
- implement group chats
- implement direct messaging system

Everything must remain Job-centric.

### 30. Definition of Done

Messaging + Notifications is complete only if:

- ✔ Job messages work
- ✔ Notifications are generated from events
- ✔ Read states work independently
- ✔ No global chat exists
- ✔ Notifications support all core events
- ✔ System is reusable across all Business Modules

---

## PART 8/10 — MOBILE WORKER SYSTEM

### 31. Purpose

The Mobile Worker System is the simplified execution interface for field employees. It is designed for speed, not complexity. A worker should be able to complete work with minimal interaction.

### 32. Core Principle

The mobile app MUST show only:

- My Jobs
- Job Details
- Media upload
- Voice messages
- Checklist
- Complete Job action

No additional complexity is allowed.

### 33. Worker Scope Limitation

Workers MUST NOT have access to:

- company settings
- business module configuration
- analytics
- financial data
- global job overview
- other workers' jobs (Workers may access only their own assigned Jobs)

### 34. Mobile Job List

Default view: Assigned Jobs only, sorted by urgency and schedule. Each Job card shows: title (module-defined label), status, time, priority (optional). No extra data is shown.

### 35. Job Detail View

A Job on mobile contains: title, description, checklist, messages, attachments, action buttons. All content is optimized for single-hand usage.

### 36. Mobile Actions

Workers can perform only:

- Send message
- Send voice message
- Upload photo
- Upload document
- Mark checklist item complete
- Mark job complete
- Update job status (Foundation statuses only)

No creation of Jobs is allowed.

### 37. Media-First Design

Mobile usage is media-centric: photos are primary evidence, voice messages replace typing, documents are secondary support. Text input is optional, not primary.

### 38. Offline Behavior (Optional Extension)

Mobile system SHOULD support: temporary local storage of messages, queued uploads, sync when connection is restored. This is optional for MVP but structurally supported.

### 39. Notification Behavior on Mobile

Workers receive notifications for: job assignment, job update, new message, urgent alerts. Notifications always deep-link into Job Detail view.

### 40. Business Module Mapping

Mobile UI labels are fully dynamic. Examples:

- Construction: Job = Objekt, Worker = Monter
- Field Service: Job = Intervencija, Worker = Serviser
- Logistics: Job = Vožnja, Worker = Voznik

No hardcoded terminology is allowed.

### 41. Performance Requirements

Mobile system MUST: load jobs instantly, cache last known state, optimize image loading, compress uploads before sending, minimize API calls. Field work environments are assumed to have unstable connectivity.

### 42. Definition of Done

Mobile Worker System is complete only if:

- ✔ Workers see only assigned jobs
- ✔ Job details are simplified and fast
- ✔ Media upload works (photo, voice, docs)
- ✔ Checklist completion works
- ✔ Job completion works
- ✔ No admin features exist in mobile
- ✔ Works across all Business Modules without changes

---

## PART 9/10 — DATA SOURCE + COMPUTATION LAYER (MVP+ LOCKED)

### 46. Purpose

This section defines how the system calculates all derived data. The system is strictly database-driven and deterministic. There is NO external computation layer. Everything is derived directly from primary tables.

### 47. Data Source Rule (Hard Backend Rule)

All system data MUST be derived ONLY from:

- jobs
- job_messages
- job_checklist_items
- notifications
- attachments
- timestamps

No other data sources exist.

### 🛑 Strict Anti-Overengineering Rules (Non-Negotiable)

**1. Computation Model (Real-Time Only)**

All computed values MUST be calculated in backend SQL queries at request time.

**RULE**

- every API request executes a fresh SQL query
- results are computed directly from primary tables
- no intermediate computation layers exist

Allowed: `SELECT COUNT(*)`, `SELECT SUM(...)`, `WHERE` filters, `GROUP BY`

Forbidden: precomputed results, stored analytics tables, background aggregation, async computation pipelines

**2. No Derived Storage**

The system MUST NOT store any computed or aggregated data.

STRICTLY FORBIDDEN: summary tables, analytics tables, counters (stored totals), denormalized aggregates, materialized views used for business logic

**RULE**: Database is ONLY source of truth. Everything else is computed.

**3. No Business Logic Background Processing**

The system MUST NOT use: cron jobs, background workers, queue systems, event-driven computation pipelines for business data processing or derived data generation.

Allowed background usage:

- ✔ notification delivery (optional infrastructure layer only)
- ✔ file processing (e.g. thumbnail generation)

These background tasks MUST NOT modify business data.

NOT allowed: any computation that changes business data, any aggregation jobs, any delayed recalculation logic

**4. No Business Logic Caching**

Allowed: HTTP caching, frontend/UI caching, static response caching for performance

Forbidden: caching of computed business values, caching of SQL-derived results as source of truth, Redis used for business logic state

**RULE**: Every response MUST reflect live database state.

**5. Consistency Rule**

The system guarantees: no duplicate sources of truth, no synchronization logic, no reconciliation processes. If data changes in DB → next query reflects it immediately.

**6. Query Responsibility Rule**

All computation is handled ONLY in: backend SQL queries.

NOT in: frontend, service layer logic, external workers, AI systems.

Backend acts as a thin query layer over database. Business rules are enforced by the backend, but all derived values are computed directly from SQL queries.

**7. Performance Rule (MVP Safe)**

Performance optimization is allowed ONLY via: database indexes, query optimization, HTTP caching.

NOT via: precomputation, background aggregation, caching business state.

**8. Design Philosophy**

This system is: deterministic, stateless, query-driven, database-first.

NOT: event-driven system, analytics platform, data pipeline system, AI computation system.

### 9. Definition of Done

This layer is complete only if:

- ✔ all metrics are computed via SQL at request time
- ✔ no derived tables exist anywhere
- ✔ no background jobs compute business logic
- ✔ no caching affects correctness
- ✔ system always reflects live DB state
- ✔ queries are the only computation mechanism

> 💡 **ONE-LINE CORE RULE (FOR DEV)**
> If it is not in the database, it does not exist. If it is computed, it is computed at request time via SQL.

---

## PART 10/10 — POLISH, LANDING & FINAL RULES (MVP+ LOCKED)

### 51. Polish Phase Purpose

Polish phase ensures the system feels production-ready. It does NOT add features. It ONLY improves: usability, loading speed (perceived performance), UI clarity, mobile responsiveness, error handling consistency.

**RULE**: No backend changes are allowed in this phase. No new logic is allowed. Polish phase MUST NOT introduce new backend logic, services, queues, caching layers, or performance systems.

### 52. Required Improvements

Must include: loading states, empty states, error handling, mobile responsiveness, consistent navigation behavior, consistent UI components, fast perceived performance.

**RULE**: These are ONLY UI/UX improvements. No functional or architectural changes are allowed. All polish improvements MUST be implemented using existing UI components only. No new frontend architecture or state systems may be introduced.

### 53. UX Consistency Rule

All Business Modules MUST use identical UI components. No design system infrastructure (Storybook, component frameworks, or abstraction layers) is allowed in MVP. Mobile app may be improved only at UI/UX level. No structural or architectural changes are allowed.

**STRICT RULE**: same components, same layout structure, same screen hierarchy

Only allowed differences: ✔ labels (text), ✔ translations, ✔ templates (content only)

FORBIDDEN: ❌ per-module UI logic differences, ❌ conditional layouts per industry, ❌ custom component behavior per module

### 54. Landing Page Rule

Landing page is a standalone presentation layer. It MUST NOT affect system architecture. It only shows: product value, supported industries, screenshots, pricing overview, call-to-action.

**RULE**: No backend dependency exists in landing page. No business logic is shared with core system.

### 55. Industry Presentation

Landing page displays: Construction, Field Service, Cleaning, Logistics (future), Installation (future)

**RULE**: All industries are presented as different configurations of the SAME platform. No industry has unique system logic.

### 56. Architectural Guarantee

The system is complete ONLY if:

- ✔ new Business Module can be added without backend changes
- ✔ UI changes only via terminology/config
- ✔ Jobs remain universal entity
- ✔ Communication remains job-based
- ✔ File system remains shared
- ✔ Mobile app works identically across industries

### 57. Final Architecture (System Map)

Foundation v2 structure:

- Foundation Core
- Business Module Loader
- Core Database
- File System
- Communication Engine
- Jobs Engine
- Notification System
- Mobile Worker App
- Owner Dashboard (Daily Summary)
- Polish Layer
- Landing Page

**RULE**: Each layer is independent. No layer may redefine another layer.

### 58. Final Principle (Hard Rule)

If an industry requires:

- ❌ new database tables
- ❌ new backend core logic
- ❌ changes to authentication
- ❌ changes to tenant isolation
- ❌ changes to Jobs model

👉 it is NOT a Business Module requirement — 👉 it is a **FOUNDATION DESIGN FAILURE**

### 59. MVP+ Hard Constraint (Final Rule)

The Polish Layer is strictly UI-level only. It MUST NOT introduce: new backend logic, new services, caching systems, state management frameworks, design system infrastructure, architectural refactoring.

Any improvement must be implemented using existing Foundation structure only.

### 60. Immutability Rule

Completed Jobs are considered historical records.

Allowed after completion: new messages, new attachments, comments

Forbidden after completion: changing checklist completion, changing job ownership, changing scheduled time, changing completed status

> 💡 **ONE-LINE FINAL LOCK**
> The Foundation is permanent. Business Modules are configuration only.

---

## PART 10A — HARD GUARDRAILS ADDENDUM (MVP+ LOCKED)

### 61. Purpose (Critical Clarification)

This section defines what the system is NOT allowed to become. These rules override any interpretation in previous sections. If a feature is not explicitly allowed → it is forbidden.

### 62. No Enterprise Expansion Rule

The Foundation MUST NOT evolve into:

- analytics platform
- data warehouse
- automation engine
- workflow orchestration system
- event-driven architecture system
- AI platform (beyond transcription + OCR extraction)
- billing platform

👉 Even partially.

### 63. No Stripe / Billing System (Absolute Ban)

The Foundation MUST NOT implement: subscriptions, pricing tiers logic, usage metering, invoices, payments, Stripe / payment providers, billing database tables.

**RULE**: Billing is NOT part of Foundation. Not now. Not later. Not configurable.

> Note: this ban is superseded later in the document by the dedicated "Subscriptions & Billing" add-on spec, which explicitly introduces Stripe + PayPal billing for the MVP.

### 64. No AI Systems Except Voice Transcription + OCR Extraction

The ONLY allowed AI usage in entire system:

- ✔ Voice-to-text transcription
- ✔ OCR text extraction

STRICTLY FORBIDDEN: job summarization, message rewriting, AI assistants, AI copilots, smart suggestions, AI tagging, AI routing, AI analytics

### 65. No Analytics or Business Intelligence Layer

The system MUST NOT include: analytics dashboards backend, reporting tables, metrics pipelines, KPIs storage, aggregation systems, data warehouse structures.

**RULE**: If a metric is needed → computed via SQL at request time only. No persistence of derived metrics.

### 66. No Event-Driven Architecture (Business Logic)

The system MUST NOT use: event buses, message brokers (Kafka, RabbitMQ, etc.), domain event systems, async event choreography, microservice event communication.

Allowed only: ✔ simple in-process function calls, ✔ optional lightweight hooks inside same backend process

**RULE**: Events are NOT architecture.

### 67. No Background Business Processing

The system MUST NOT include: cron jobs for business logic, background workers for computation, queued job processors for state changes, delayed consistency systems.

Allowed ONLY: ✔ file processing (OCR, thumbnails, compression), ✔ notification delivery (best-effort)

**RULE**: Business state is never computed in background.

### 68. No Workflow Engine

The Foundation MUST NOT support: custom workflows, rule engines, conditional job logic systems, dynamic state machines, configurable automation flows.

**RULE**: Job status is fixed and universal. No system can extend it.

### 69. No Pluggable Backend Modules

The system MUST NOT allow: runtime module injection, backend plugins, dynamic feature loading, per-industry backend logic extensions.

**RULE**: Only frontend configuration defines differences between industries. Backend is identical for all.

### 70. No Secondary Databases or Data Layers

The system MUST NOT introduce: reporting databases, analytics databases, cache-as-source-of-truth systems, read-replica logic layers for business logic.

**RULE**: There is exactly ONE source of truth: 👉 primary relational database

### 71. No Complex Sync Systems

The system MUST NOT implement: offline conflict resolution engines, distributed sync systems, multi-device state reconciliation logic.

Allowed: ✔ simple last-write-wins at database level

### 72. Core Architectural Guarantee

The Foundation MUST remain: database-driven, SQL-computed, stateless in business logic, non-event-driven, non-AI-driven (beyond transcription + OCR extraction), non-billing system, non-analytics system.

### 73. Final System Boundary (Absolute Rule)

If a feature introduces: money logic, AI logic beyond transcription or OCR extraction, analytics storage, event architecture, workflow automation, background computation of business data

👉 it is NOT a feature — 👉 it is a violation of Foundation design

### 74. Definition of Done (Global Override)

The system is considered correctly implemented ONLY if:

- ✔ no billing system exists anywhere
- ✔ no AI exists except transcription + OCR extraction
- ✔ no analytics tables exist
- ✔ no event-driven architecture exists for business logic
- ✔ no workflow engine exists
- ✔ no background business computation exists
- ✔ no secondary database exists
- ✔ all logic is query-time SQL over primary tables
- ✔ Daily Report is generated from SQL queries and existing database records only.

> **ONE-LINE MASTER RULE (FOR DEVELOPERS)**
> If it introduces intelligence, automation, money logic, or architectural complexity — it does not belong in Foundation.

---

## COMMUNICATION INFRASTRUCTURE — ADD-ON SPEC: VOICE-TO-TEXT (DEEPGRAM INTEGRATION — FINAL MVP+)

### 1. Purpose (Non-Negotiable)

Voice messages are only a faster way to create normal messages. There is NO audio chat experience. Every voice recording MUST be transcribed into text before becoming part of the communication system. Audio may be retained as an attachment, but the primary representation of every voice message is its transcription.

**Final UI Rule**

- The UI displays messages as normal chat messages.
- Audio is never the primary message content.
- The original audio file is stored only as an attachment for reference.

### 2. Required Provider

Selected provider: **Deepgram — Nova-3**

Reason: strong Slovene support, high transcription accuracy, optimized for short recordings, stable production quality.

**RULE**: No alternative providers are allowed.

### 3. Audio Flow (Locked)

1. User records a voice message (maximum 15 seconds).
2. Audio file is uploaded to storage.
3. Backend performs a synchronous HTTP request to Deepgram.
4. Deepgram returns the transcript.
5. Backend creates one message record:
   - `message_type = "voice"`
   - `content = transcript_text`
   - `attachment_id = audio_file_reference`
   - `attachment_type = "audio"`
6. UI renders the transcript exactly like any other message.

**RULE**: The original audio is preserved only as an attachment and is never the primary message shown in the interface.

### 4. Deepgram Configuration (Locked)

Required configuration:

```
model = nova-3
language = sl
punctuate = true
smart_format = true
diarize = false
```

**RULE**: Configuration is fixed and must never be changed dynamically.

### 5. API Call

```
POST https://api.deepgram.com/v1/listen?model=nova-3&language=sl&punctuate=true&smart_format=true&diarize=false
```

**RULE**: Only synchronous HTTP requests are allowed.

### 6. Processing Model

Allowed flow only:

```
UPLOAD → TRANSCRIBE → STORE → RETURN RESPONSE
```

**Strictly Forbidden**: streaming transcription, websocket audio, partial transcription, asynchronous pipelines, queues, retry orchestration.

The complete operation happens inside a single request.

### 7. Failure Rule

If transcription fails:

- the message MUST still be created
- the audio file MUST still be stored
- content MUST become: `"Voice message (untranscribed)"`

Communication must never fail because an external provider is unavailable.

### 8. Performance

Expected latency:

- 1–3 second recording → almost instant
- 5–15 second recording → approximately 1–4 seconds

This is NOT a real-time voice communication system.

### 9. Cost

Deepgram pricing depends only on audio duration. The application MUST NOT contain: billing logic, runtime cost calculations, usage-based behaviour.

### 10. Data Model

Table: `job_messages`

Normal message: `message_type = "text"`, `content = text`, `attachment_id = NULL`, `attachment_type = NULL`

Voice message: `message_type = "voice"`, `content = transcript_text`, `attachment_id = audio_file_reference`, `attachment_type = "audio"`

**RULES**

- The transcript is always stored in content.
- The original audio is always stored as an attachment.
- No duplicate message rows.
- No separate voice tables.
- No transcript tables.

### 11. Quick Replies

Quick replies are frontend shortcuts only. After selection they become normal text messages. Backend has no knowledge of quick reply labels or localization.

### 12. Notifications

Creating a message may directly trigger notification delivery through an in-process function call. This is NOT: an event bus, a queue, asynchronous architecture, a messaging platform.

### 13. Job Timeline Rule

Voice messages are displayed in the Job Timeline exactly like normal messages. No separate voice UI, no voice chat component, and no audio playback state is allowed inside the chat interface. A small microphone indicator is optional and serves only as visual metadata.

### 14. Idempotency Rule

Each uploaded audio file MUST produce exactly one message record. Retrying upload, transcription, or network requests must never create duplicate messages. Idempotency key = `attachment_id`.

### 15. Industry Compatibility

The implementation works identically for all supported industries: Construction, Field Service, Cleaning, Logistics. Only terminology and labels change.

### 16. Design Principle

The system must remain: ✔ synchronous, ✔ deterministic, ✔ request-driven, ✔ stateless, ✔ database-centric.

It must NOT become: ✖ AI assistant, ✖ streaming platform, ✖ audio chat, ✖ messaging platform.

### 17. Purpose

This feature exists only for: faster field reporting, hands-free input, easier communication.

It does NOT exist for: audio conversations, AI assistants, voice chat.

### 18. Definition of Done

The implementation is complete only if:

- ✔ users can record voice messages up to 15 seconds
- ✔ audio uploads successfully
- ✔ Deepgram transcribes the recording
- ✔ transcript is stored in content
- ✔ original audio is stored as an attachment
- ✔ attachment_type is set to "audio"
- ✔ UI displays the transcript as a normal message
- ✔ voice messages appear identically to text messages in the timeline
- ✔ message creation succeeds even if transcription fails
- ✔ duplicate messages cannot be created by retries
- ✔ no streaming exists
- ✔ no asynchronous architecture exists
- ✔ no separate voice models, tables or UI components exist

### 19. Final Architectural Rule

Voice input is simply another way to create a normal message. The messaging system remains unified. The only differences are:

- `message_type = "voice"`
- the original audio attachment is preserved
- the UI may optionally display a microphone indicator

---

## ADD-ON SPEC — DOCUMENT OCR (MISTRAL OCR)

### 1. Purpose (Non-Negotiable)

OCR is a fast extraction layer for uploaded files. Its only purpose is: → convert documents and images into text

OCR is NOT: AI system, document understanding engine, workflow system, analytics system.

**RULE**: OCR only produces text. Nothing else.

### 2. Required Provider

Selected provider: **Mistral OCR API**

**RULE**: No alternative providers are allowed.

### 3. Supported Input

OCR runs automatically for: PDF, JPG, JPEG, PNG, HEIC

### 4. Processing Flow (Locked)

1. upload file
2. store original file
3. send file to Mistral OCR
4. receive extracted text
5. store OCR text
6. make OCR text available in system

**RULE**: This is a synchronous request-time process where possible. OCR extracts plain text only. The system does not interpret, classify or structure extracted content.

### 5. Storage Rule

Stored data: `file_path`, `ocr_text (nullable)`, `attachment_type = "pdf" | "image" | "other"`

**RULE**: Original file is never modified.

### 6. Search Behavior

All OCR text is searchable globally across: Jobs, Files, Company scope

**RULE**: Search operates only on stored OCR text.

### 7. Timeline Rule (Critical Alignment with Voice)

Whenever a file is uploaded, the system MUST automatically create a Timeline entry. Each Timeline entry contains: timestamp, user_id (uploader), attachment_type, filename, OCR preview (if available).

If OCR extraction fails or is unavailable → the Timeline stores the filename only.

**RULE**: Timeline represents the operational history of a Job. It is chronological, read-only, and shared with all other Job events (messages, checklist updates, status changes, uploads). Timeline is NOT an analytics system.

**7.1 OCR Timeline Rule**

Whenever OCR extraction completes successfully, the system MUST append an additional Timeline event. The event contains: "Document processed", "OCR completed", "Extracted text available", user_id, timestamp.

**RULE**: OCR processing becomes part of the Job Timeline to provide full traceability of document processing, especially when OCR is performed using an external AI service.

### 8. Daily Report Input

OCR text is used for: reporting context, daily summaries, reconstruction of job activity.

**RULE**: OCR is only a data source. Never a processor.

### 9. Failure Rule

If OCR fails: ✔ file is still stored, ✔ `ocr_text = NULL`, ✔ upload never fails

### 10. Cost Rule

OCR cost is external only.

**RULE**: No runtime logic depends on cost or pricing.

### 11. Strictly Forbidden

DO NOT implement: embeddings, vector search, RAG systems, AI document chat, semantic indexing, document workflows, reprocessing pipelines.

### 12. Core Model Rule (Important Alignment)

OCR behaves exactly like Voice input:

- **VOICE**: input → message (text + metadata)
- **OCR**: input → file + extracted text + timeline event

**RULE**: Both are ingestion systems, not feature systems.

### 13. Definition of Done

- ✔ file upload works
- ✔ OCR extracts text automatically
- ✔ OCR text is globally searchable
- ✔ timeline entry always created
- ✔ upload never fails due to OCR
- ✔ no secondary processing pipelines exist

---

## TIMELINE SYSTEM SPECIFICATION (FINAL MVP — LOCKED)

### 1. Purpose

Timeline is the operational history of a Work Card. Its purpose is to record: what happened, when it happened, who performed the action.

Timeline is NOT: analytics, reporting, audit logging, event streaming.

Timeline is an immutable history of Work Card business events.

### 2. Scope

Timeline exists ONLY within Work Cards.

Included: Work Card lifecycle, messages, voice processing, file operations, OCR processing, checklist actions, AI actions

Excluded: login events, user profile changes, company settings, system configuration, billing, analytics

If an action is not related to a Work Card, it MUST NOT appear in Timeline.

### 3. Core Principles

Timeline is: append-only, immutable, chronological, synchronous. Timeline entries are never updated or deleted. Timeline never replaces business tables.

**Audit Rule**

Every significant user action creates exactly one Timeline event. Timeline is the only audit log in the system. Messages, uploads, OCR processing, checklist completion, status changes, notification dismissal and other operational actions are recorded there. No separate audit systems exist.

### 4. Data Model

```json
{
  "id": "uuid",
  "company_id": "uuid",
  "work_card_id": "uuid",
  "event_type": "string",
  "user_id": "uuid | null",
  "metadata": {},
  "created_at": "timestamp"
}
```

Rules:

- `user_id` contains the user who performed the action.
- `user_id = NULL` only for system-generated events.
- Human-readable text is never stored.

### 5. Event Types

Only the following event types are allowed in the MVP.

**Work Card**: work_card_created, work_card_updated, work_card_assigned, work_card_completed, work_card_reopened, work_card_status_changed

**Checklist**: checklist_item_added, checklist_item_completed

**Messages**: message_created, voice_message_created, voice_transcription_completed

**Files**: file_uploaded, file_deleted

**OCR**: ocr_processed

**AI**: ai_action_completed

Each event type creates exactly one Timeline entry.

### 6. Metadata Rule

Metadata contains only the values required to render the event.

Examples: `{ "file_name": "Invoice.pdf" }`, `{ "status": "Completed" }`

Metadata MUST NOT duplicate complete business objects.

### 7. UI Rendering

The frontend generates display text using: event_type, metadata, user_id. The backend never stores rendered text.

Examples: "Marko uploaded Invoice.pdf", "Alma deleted Contract.pdf", "Peter completed checklist item", "AI completed OCR processing"

### 8. API

**Create Timeline Event** — Internal backend function: `createTimelineEvent()`

**Get Timeline** — `GET /work-cards/{work_card_id}/timeline` — Returns all events ordered by `created_at DESC` (newest first)

**8.1 Timestamp Rule**

All timestamps are generated exclusively by the backend using the server system clock. Client devices never provide official timestamps. Whenever a user performs an action (checklist completion, message creation, upload, status change, etc.), the backend records the current server time.

### 9. Failure Rule

Timeline failures MUST NOT roll back the business operation.

Examples:

- File upload succeeds → Timeline insert fails → file remains uploaded.
- Message is sent → Timeline insert fails → message remains sent.
- Checklist item is completed → Timeline insert fails → checklist remains completed.

Timeline is historical information, not business data.

### 10. Performance

Timeline uses: synchronous database inserts, one insert per event. No queues, brokers, event streaming or background pipelines are part of the MVP.

### 11. Definition of Done

- ✔ every supported Work Card action creates one Timeline entry
- ✔ every Timeline entry records what happened, who performed it (or System), when it happened
- ✔ file uploads are logged
- ✔ file deletions are logged
- ✔ messages are logged
- ✔ voice messages are logged
- ✔ voice transcription completion is logged
- ✔ OCR processing is logged
- ✔ checklist actions are logged
- ✔ AI actions are logged
- ✔ UI generates all display text
- ✔ Timeline remains Work Card scoped only

### 12. Final Architectural Rule

Timeline is a minimal immutable history of Work Card business events. It records operational activity only. Nothing more.

---

## DEVELOPER REFERENCE APPENDIX — UNIFIED DATA MODEL & EVENT MAPPING (REFERENCE ONLY)

### 0. Purpose (Important)

This document is a developer reference, not a feature specification. It exists to: unify mental model, reduce ambiguity, connect existing specs, provide implementation clarity.

**RULE**: This document must NOT introduce new business rules.

### 1. Implementation Priority (Critical)

If conflict appears between documents:

1. FOUNDATION v2 (Core Rules)
2. Feature Specifications (Voice, OCR, Timeline)
3. This Appendix (Reference only)

**RULE**: This appendix can NEVER override core specifications.

### 2. Core Architectural Model

```
Business Tables = STATE
Timeline = HISTORY
```

**RULE**: Timeline is NEVER a source of truth.

### 3. Unified Data Model (System Overview)

```
JOB
│
├── job_messages
│     ├── text messages
│     └── voice messages (transcribed)
│
├── job_files
│     ├── original file (image/pdf/audio)
│     └── ocr_text (optional)
│
├── checklist_items
│
└── timeline (immutable history log)
```

### 4. Entity Rules

**JOB** — root entity; all actions belong to a job

**job_messages** — Stores communication only. `message_type: "text" | "voice"`. Voice messages include transcription in content. **RULE**: Each message MUST generate exactly one Timeline entry.

**job_files** — Stores uploaded files. File is always stored first; OCR is optional processing step. **RULE**: `file_uploaded` → always logged; `ocr_processed` → success or failed

**timeline** — Immutable log of Job actions. Append-only, Job-scoped only, never edited or deleted.

### 5. Event Mapping Table (Dev Source of Truth)

**Job Events**

| Action | event_type | user_id |
|---|---|---|
| Job created | job_created | user_id |
| Job updated | job_updated | user_id |
| Job assigned | job_assigned | user_id |
| Job completed | job_completed | user_id |

**Message Events**

| Action | event_type | user_id |
|---|---|---|
| Text message sent | message_created | user_id |
| Voice message sent | voice_message_created | user_id |

**File Events**

| Action | event_type | user_id |
|---|---|---|
| File uploaded | file_uploaded | user_id |

**OCR Events**

| Action | event_type | user_id |
|---|---|---|
| OCR success | ocr_processed | NULL |
| OCR failure | ocr_processed | NULL |

OCR metadata:

```json
{
  "status": "success | failed",
  "ocr_text_length": "number",
  "processing_time_ms": "number"
}
```

### 6. Timeline Generation Rule

Every logical business action MUST generate exactly ONE Timeline entry.

**RULE**: Timeline represents business-level events, not technical steps.

**Examples**

*File upload + OCR* — System actions: store file, run OCR → Timeline: `file_uploaded`, `ocr_processed`

*Voice message* — System actions: upload audio, transcribe, store message → Timeline: `voice_message_created`

*Job update* — Timeline: `job_assigned`

### 7. UI Rendering Rule

UI NEVER stores text labels. UI generates display text from: `event_type + metadata + user_id`

Example: Developer sees "file_uploaded" → Frontend (SL) shows "Marko je naložil Invoice.pdf"

### 8. Language Separation Rule (Important Clarity)

Documentation examples: English only. User-facing UI: localized (Slovenian).

### 9. System Boundary

Allowed systems: Jobs, Messages, Files, OCR, Timeline

Forbidden: analytics, workflows, queues, event buses, AI (except transcription + OCR extraction)

### 10. Failure Rule

- OCR failure → still logged
- file upload failure → no Timeline entry
- system must never silently fail

### 11. Core Principle

```
USER ACTION
  ↓
STATE CHANGE (DB)
  ↓
TIMELINE ENTRY (immutable)
```

### 12. One-Sentence Dev Rule

If it changes a Job → it MUST appear in Timeline exactly once.

### 13. Final Safety Rule

This document: explains, does not define, does not override.

---

## ADD-ON SPEC — JOB FILE ATTACHMENTS (UPLOAD SYSTEM) — FINAL LOCKED

### 1. Purpose (Non-Negotiable)

Files are used only as attachments to a Job. They provide supporting context for job execution: invoices, delivery notes, images, PDFs, reports.

Files are NOT: document management system, business objects, workflow entities, standalone system resources.

### 2. Scope (Strict)

This system includes ONLY: file upload, file storage, file metadata, file deletion, Job-level visibility, Timeline tracking. Nothing else.

### 3. Attachment Principle (Critical)

A file is always attached to exactly one Job. Files cannot exist outside a Job context. One File → One Job. Job Files are the implementation of the Foundation attachment system.

### 4. File Immutability Rule (Critical)

Once uploaded: the original file is never modified; the original file is never overwritten. Replacing a document ALWAYS creates a new file record.

### 5. No File Relationships Rule

Files are flat entities. The system MUST NOT implement: folders, hierarchies, collections, parent-child relationships, links between files.

### 6. File Lifecycle Rule

There is no file lifecycle. Files do not have statuses. Files exist until deleted. The system MUST NOT implement: approved, rejected, archived, processed, reviewed, verified.

### 7. File Deletion Rule (Final Hardened)

Files are soft deleted.

Schema: `deleted_at (nullable timestamp)`

Deletion is allowed only for: Company owner (always full access within company scope), Job manager ("šefe", if exists), file uploader

Effects:

- deleted files are hidden from normal Job views
- file may remain in storage, but MUST NOT be accessible through any system interface or API under any condition
- Deletion MUST be recorded in Timeline.

### 8. Data Model

Table: `job_files`

Required fields: `id (uuid)`, `job_id (uuid)`, `uploaded_by (uuid)`, `file_name (string)`, `attachment_type (image | pdf | audio | other)`, `storage_path (string)`, `file_size (bigint)`, `created_at (timestamp)`, `deleted_at (timestamp | null)`

No additional business fields.

### 9. Upload Flow (Simple & Synchronous)

```
upload
    ↓
store file
    ↓
create DB record
    ↓
create Timeline event (file_uploaded)
```

**Transaction Rule (Critical)**

- File record creation and Timeline creation MUST happen in the same database transaction
- Timeline event MUST NOT be created if any previous step fails
- Timeline event MUST be part of the same successful transaction as file creation
- A single successful file upload action MUST result in exactly one Timeline entry
- Duplicate Timeline entries for the same upload are strictly forbidden

**OCR Dependency Rule**

- File upload MUST NEVER depend on OCR processing
- OCR is an optional post-processing step and must not block or delay file creation

### 10. File Size Limit (Hard Rule)

Maximum file size is enforced at application level (default: 25MB per file). Files exceeding limit MUST be rejected before storage.

### 11. Search Rule

Files are searchable within the Job context using: file_name, extracted OCR text (if available). Search results are ALWAYS constrained by Job-level permissions.

### 12. Security Rule (Critical Simplification)

Access is evaluated ONLY at Job level. If a user has access to the Job, the user has access to every file within that Job. File-level permissions do NOT exist. Job-level visibility defines file access. No file is accessible outside its Job context under any condition.

### 13. Timeline Integration

Every successful upload MUST create exactly one Timeline entry: `event_type: file_uploaded`, `user_id: uploader`

Rules:

- Timeline entry is created only for the initial upload action
- Internal processing (OCR, compression, thumbnails) MUST NOT create Timeline events
- A single upload action always produces exactly one Timeline entry
- Duplicate Timeline entries for the same upload are not allowed

Metadata MAY include: file_id, file_name, attachment_type, file_size

### 14. Upload Failure Rule

If upload fails: no file record is created; no Timeline entry is created. Only successful uploads are tracked.

### 15. Global Behavior Rule

A file is not a business object. It is only a passive Job attachment providing operational context. A file never represents business state.

### 16. Delete Timeline Rule

When a file is deleted: a Timeline entry MUST be created.

### 17. Performance Principle

The system must remain: simple, synchronous, deterministic, stateless in business logic, database-driven.

The system MUST NOT become: document management platform, collaboration platform, workflow engine, file management system.

### 18. Definition of Done

- ✔ file upload works
- ✔ file is stored correctly
- ✔ database record is created
- ✔ file appears inside its Job
- ✔ original file is immutable
- ✔ soft delete works
- ✔ deleted files are not accessible via UI or API under any condition
- ✔ only authorized users can delete
- ✔ Timeline logs every successful upload
- ✔ search works through file_name and extracted OCR text
- ✔ Job-level security is enforced
- ✔ file size limit is enforced
- ✔ upload never depends on OCR
- ✔ no file lifecycle exists
- ✔ no file relationships exist
- ✔ no file-level permissions exist

### 19. Final Architectural Rule

A file is a passive Job attachment. It exists only to support execution of work within a Job. Nothing more.

**🟢 Final Status**: fully deterministic, no hidden assumptions, no storage ambiguity, no permission edge cases, no OCR coupling risk, no workflow creep, no enterprise expansion path

---

## ADD-ON SPEC — SUPABASE STORAGE (MVP) — FINAL LOCKED v1.3

### 1. Purpose

Defines Supabase Storage as the ONLY object storage layer in the system.

Supabase Storage is responsible ONLY for: object storage, file retrieval via signed URLs, signed URL generation.

Supabase Storage is NOT responsible for: upload orchestration, validation, compression, retries, business logic, database relations, permissions, lifecycle management, file naming logic beyond storing provided path.

### 2. Supabase Setup

Bucket: `job-files`

Bucket type: private (STRICT — no public access)

### 3. Environment

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=NOT USED
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxx (backend only)
SUPABASE_STORAGE_BUCKET=job-files
```

### 4. Storage Contract

`storage_path` is generated BEFORE any processing begins.

Format: `jobs/{job_id}/{uuid}.{extension}`

Rules:

- backend generates storage_path
- UUID generated by backend
- Supabase stores file exactly as provided
- files are immutable
- no overwrites allowed
- storage_path stored in job_files
- file is ONLY valid after DB record exists
- files exist in temporary invalid state until DB insert succeeds

### 5. Upload Flow (Backend Only)

Backend uploads via Supabase SDK.

Rules: no frontend upload; max timeout: 30s; retry = new upload (unless duplicate exists after DB insert); no idempotency system; duplicate detection applies only after DB insert.

### 6. Atomic Upload Rule (Critical)

File is valid ONLY if: Supabase upload succeeds AND job_files record exists.

If DB insert fails: file is orphaned, ignored by system.

If upload fails: no DB insert, request fails.

### 7. File Access (Signed URL Only)

- no public access
- frontend never constructs URLs
- backend generates signed URLs
- signed URLs are time-limited
- frontend must re-fetch expired URLs
- signed URLs are temporary representations of DB records

### 8. Security Model

Supabase is passive storage only. Access requires: company check, user active, role, job access.

### 9. MIME Validation (Server Only)

Client MIME is ignored. Backend detects real MIME from binary.

Allowed: image/jpeg, image/png

Validation happens after upload processing begins.

### 10. File Visibility

- hidden files exist in DB
- excluded from default API responses
- require explicit request flag
- no separate hidden system

Hidden files may still generate signed URLs if explicitly authorized.

### 11. Source of Truth

`job_files` is ONLY source of truth. Storage alone has no meaning; orphan files ignored; no cleanup system in MVP.

### 12. File Limits (Final)

Per request: max 3 files. Per job: max 6 files total.

If exceeded: entire request rejected.

### 13. File Hash (Deduplication)

SHA-256 computed from ORIGINAL FILE BYTES BEFORE processing.

Rules: duplicate detection only after DB insert; same file_hash + same job → reject duplicate; retry before DB insert is always allowed.

### 14. Failure Rule

Upload fail: no DB, no timeline.

DB fail: orphan file, ignored.

### 15. Timeline Rule

Timeline events are created ONLY after DB insert. No partial pipeline events allowed.

### 16. System Boundary

Supabase provides ONLY: object storage, file retrieval, signed URLs. Nothing else.

**Final Status**: ✔ deterministic MVP, ✔ no race-condition ambiguity, ✔ no storage vs DB confusion, ✔ clean retry model, ✔ safe for Cursor/Claude implementation

---

## ADD-ON SPEC — IMAGE UPLOAD SERVICE (MVP) — FINAL LOCKED v1.3

### 1. Purpose

Handles full image pipeline for Job attachments. Includes: validation, optimization, upload, DB insert, timeline event.

### 2. Supported Formats

JPG, JPEG, PNG

### 3. Processing Pipeline

```
receive image
→ generate storage_path (before processing)
→ detect MIME (server only)
→ validate format
→ fix EXIF orientation
→ resize (max 1920×1920)
→ compress
→ check size (≤ 500KB)
→ generate UUID
→ upload to Supabase
→ create job_files record
→ create timeline event
```

If any step fails → stop immediately, no DB insert, no timeline event.

### 4. Image Rules

Max dimensions: 1920 × 1920. Max size: 500 KB

### 5. Compression Rules

**JPEG**: quality 70–75, single pass only

**PNG**: alpha → keep PNG; no alpha → convert to JPEG

### 6. File Key Rule

`jobs/{job_id}/{uuid}.{extension}`

Rules: UUID generated by backend; filename never used for storage; metadata may store original filename; each upload = new file.

### 7. Upload Rule

Valid ONLY if: Supabase upload succeeds AND DB insert succeeds.

### 8. File Hash Rule

SHA-256 from ORIGINAL FILE BYTES BEFORE processing. Used only for duplicate detection AFTER DB insert.

### 9. Failure Rule

Any failure: stop process, no DB record, no timeline event. Retry = new upload (unless duplicate exists after DB success)

### 10. Timeline Rule

Exactly one event per successful DB insert: `image_uploaded`. No pipeline-level events allowed.

### 11. System Boundary

This service handles ONLY: validation, optimization, upload orchestration, DB writes, timeline writes.

NOT: storage configuration, CDN, cleanup systems, background jobs.

### 12. Final Rule

Image = compressed Job attachment. No other meaning.

---

## 🟢 FOUNDATION v2 — DAILY WORK CARD MODEL (MVP LOCKED v3 FINAL)

### 1. Core Concept (Absolute Foundation)

System is built around: 👉 **DAILY WORK CARD (DWC)**

Each Worker has:

- ✔ exactly ONE Daily Work Card per day
- ✔ all work for that day goes inside that card
- ✔ nothing exists outside it (work scope only)

Each Daily Work Card contains: tasks, photos, documents, messages, voice notes, timeline (full record of the day)

👉 If it's not inside the card → it does not exist in the system (for work data only)

### 2. Creation Rule (Critical)

👉 Daily Work Cards are created manually by an Owner or Manager.
👉 The system NEVER creates Daily Work Cards automatically.

Each card represents a real-world work assignment (route, job day, shift, or operational duty).

### 3. Isolation Rule (Critical)

Each Daily Work Card is: fully isolated container, belongs to exactly ONE worker, belongs to exactly ONE day, contains ALL work data for that worker that day. No cross-worker visibility.

### 4. Task Model (Simplified)

Tasks exist only inside a Daily Work Card. A worker may have: 1 task (full-day assignment) or multiple tasks (multi-stop or multi-step day).

Examples: loading goods, delivery route, site work, cleaning assignment

Tasks are just structured units of work inside the card.

### 5. Data Structure

Each Daily Work Card contains: Tasks, Attachments (images, documents), Messages, Voice-to-text notes, Activity log, Timeline

👉 Each Daily Work Card contains its own Timeline, which represents the complete chronological record of all work performed within that card.

### 6. Communication Model (Strict)

System supports 4 communication methods:

1. **Internal Message** — text, stored inside Daily Work Card
2. **Voice-to-Text** — voice recorded, converted to text, stored inside card
3. **Phone Call** — opens native dialer, no data stored
4. **Email** — opens native email app, no backend storage

### 7. Strict Communication Rules

❌ No worker-to-worker communication
❌ No global chat
❌ No free-form messaging outside card
❌ No attachments outside Daily Work Card

✔ Everything must belong to: 👉 worker → their Daily Work Card

### 8. Attachment Rule (Critical)

Workers can upload: images, documents, files — BUT ONLY if attached to a Task inside their Daily Work Card.

Invalid cases: file without Task → rejected; attachment without card context → rejected

### 9. Cross-Worker Rule (Hard Isolation)

Workers: cannot see other workers, cannot message other workers, cannot access other Daily Work Cards.

All communication is: 👉 worker ↔ manager only

### 10. Manager Model

Manager can: create Daily Work Cards (manual), assign workers, assign tasks inside cards, monitor progress, view all cards. Manager is operational controller.

### 11. Owner Model

Owner: sees everything, manages managers and workers, controls structure, full system access

### 12. Permission Matrix (MVP Clean)

| Permission | Owner | Manager | Worker |
|---|---|---|---|
| View own Daily Work Card | ✅ | ✅ | ✅ |
| View all Daily Work Cards | ✅ | ✅ | ❌ |
| Create Daily Work Cards | ✅ | ✅ | ❌ |
| Edit Daily Work Cards | ✅ | ✅ | ❌ |
| Assign Worker | ✅ | ✅ | ❌ |
| Create Checklist | ✅ | ✅ | ❌ |
| Edit Checklist | ✅ | ✅ | ❌ |
| Complete Checklist Item | ✅ | ✅ | ✅ |
| Upload Attachments | ✅ | ✅ | ✅ |
| Run OCR | ✅ | ✅ | ✅ |
| Send Internal Messages | ✅ | ✅ | ✅ |
| Voice-to-Text | ✅ | ✅ | ✅ |
| View Timeline | ✅ | ✅ | ✅ |
| Delete Notification Card | ✅ | ✅ | ✅ |
| User Management | ✅ | ❌ | ❌ |
| Billing / Settings | ✅ | ❌ | ❌ |

**Authorization Evaluation Order**

Every request MUST be authorized in the following order:

1. Company isolation
2. User is authenticated
3. User account is active
4. User role permissions
5. Daily Work Card access
6. Requested resource access

**12.1 Daily Work Card Mapping Rule**

Daily Work Card is NOT a separate backend entity. A Daily Work Card is simply one Job representing one worker's work for one day. The frontend may refer to Jobs as "Daily Work Cards", but the backend stores only Jobs. There is no `daily_work_cards` table.

### 13. System Boundary

System handles only: Daily Work Cards, Tasks inside cards, Attachments inside tasks, Timeline logging, Communication inside card

System does NOT: allow global chat, allow unscoped data, support cross-card data mixing, allow worker-to-worker communication

### 14. Final Architecture Statement

👉 The entire system is a collection of manually created, isolated Daily Work Cards.

Each card represents: one worker, one day, one real-world work assignment.

Nothing exists outside this structure (for work data).

---

## ADD-ON SPEC — INTERNAL MESSAGES (MVP) — FINAL LOCKED v1.1

### 1. Purpose

The Internal Messages module provides lightweight operational communication inside the platform. Its purpose is to reduce phone calls, SMS messages and external communication tools by allowing users to exchange short work-related messages directly from a Work Card.

This is NOT a chat application. It is a simple work coordination layer attached to a specific Work Card.

### 2. Core Principles

- Asynchronous communication
- Short operational messages
- Always attached to a single Work Card
- Manager ↔ Worker communication only
- Workers cannot message other workers.

Internal Messages module is the UI implementation of Foundation `job_messages`.

### 3. Message Location

Messages are not a standalone module. Every Work Card contains a Messages tab. Opening the tab displays the complete message history for that Work Card together with the message input. All messages remain permanently attached to that Work Card.

### 4. Data Model

Table: `messages`

- id
- company_id
- work_card_id
- sender_id
- recipient_id
- content
- is_urgent
- created_at
- read_at

### 5. Message Rules

Each message: belongs to exactly one Work Card, cannot be edited, cannot be deleted, has no attachments, has no reactions, has no threads, has no emoji system

Maximum length: 400 characters. If exceeded: "Maximum message length is 400 characters."

### 6. User Interface

Messages are displayed as a simple chronological list. Each message displays: sender name (left, bold), timestamp (right), optional NUJNO badge, message text.

Example:

```
Messages

Alma B.                        09:42
[ NUJNO ]

Loading changed.
New pickup time 14:00.

────────────────────────

Mark Novak                     09:47

Potrjeno.
```

The NUJNO indicator MUST be displayed as: rounded badge, red background, white text. It MUST NOT be displayed as plain text.

The message composer is always displayed below the message history.

Fields:

```
Sporočilo

[Vnesi sporočilo...]

0 / 400

☐ NUJNO

[ POŠLJI ]
```

Rules: Send button is disabled while the message is empty. Character counter is always visible.

### 7. Urgent Flag

Only one priority exists: Normal or Urgent.

Database: `is_urgent = true`

When true: Display the NUJNO badge. No other priority levels exist.

### 8. Notification Delivery

When a new message is created: The application MUST notify the recipient. Notification includes: notification sound, mobile vibration (where supported), unread message badge.

The application MUST periodically check for new messages while the user is signed in. Polling interval: **30 seconds**

When new unread messages are detected: unread badge is updated, notification sound is played, mobile vibration is triggered (where supported), the currently opened Messages panel is refreshed automatically.

Notification sound and vibration MUST be triggered only for newly detected unread messages. No WebSocket infrastructure is required.

**Global Polling Rule**

All client polling within the MVP uses a fixed interval of 30 seconds. This includes: internal messages, notifications, unread counters, communication updates. No component may define a different polling interval.

**8.1 Notification Lifetime (Final)**

Notifications never expire automatically. A notification remains visible until a user explicitly dismisses it. Dismissing a notification removes it only from the notification list.

The following Timeline events MUST be created: notification created, notification viewed (optional), notification dismissed

Timeline stores: user, timestamp, notification content. All timestamps stored UTC.

If the notification originated from an internal message, the original message remains permanently stored. Only the notification card is removed.

### 9. Read State

Database field: `read_at`

Rules: NULL = unread; timestamp = read

When the user opens the Messages tab for a Work Card: The backend marks all unread messages for that Work Card where the current user is the recipient as read.

### 10. Card History

Every Work Card contains its own complete message history.

Messages are always displayed in chronological order. Oldest message appears first. Newest message appears last. New messages automatically appear at the bottom. All history remains permanently attached to the Work Card.

### 11. API

**Send Message** — `POST /messages` — Creates a new message.

**Get Messages** — `GET /work-cards/{work_card_id}/messages` — Returns all messages for a Work Card, ordered chronologically (oldest first).

**Mark Messages as Read** — `PATCH /work-cards/{work_card_id}/messages/read` — Marks all unread messages for the current recipient within the specified Work Card as read. The frontend sends only the Work Card ID. The backend updates all matching unread messages automatically.

**Get Unread Count** — `GET /messages/unread-count` — Returns the number of unread messages for the current user. Used by frontend polling.

### 12. Authorization

The backend is responsible for enforcing all authorization rules. The backend MUST verify that:

- the Work Card belongs to the current company
- the sender belongs to the current company
- the recipient belongs to the current company
- the sender has permission to access the specified Work Card
- the recipient is allowed according to the Manager ↔ Worker communication rules

Requests violating any of these rules MUST be rejected. The frontend MUST NOT be trusted for authorization.

### 13. Business Rules

- Messages always belong to one Work Card.
- Managers can send messages to assigned workers.
- Workers can reply only to the manager responsible for that Work Card.
- Workers cannot message other workers.
- Messages are intended only for short operational communication.
- Longer discussions should use email or external communication channels.

### 14. MVP Scope

**Included**: send message, receive message, Work Card message history, urgent flag, read/unread state, notification sound, vibration, unread badge, automatic polling every 30 seconds

**Excluded**: chat system, group conversations, attachments, voice messages, video calls, reactions, editing, deleting, threads, online status, typing indicators, WebSockets

### 15. Final Principle

Internal Messages is a lightweight operational communication system attached to a Work Card. Its purpose is to replace operational phone calls and WhatsApp messages with structured, auditable communication inside the platform while remaining intentionally simple and focused.

---

## DESKTOP DASHBOARD — COMPANY WORKBENCH (CORE SPECIFICATION)

> Detailed instructions (do not shorten this to prevent guessing; it needs to work as it's said)

### General Concept

This dashboard is the primary desktop workspace for the company owner, manager or office staff. The application is designed for small companies (up to 12 employees). The entire interface is card-based.

There are exactly three columns:

1. **DANES - TEREN**
2. **DANES - PISARNA**
3. **KOMUNIKACIJA**

Do NOT introduce additional columns, widgets, AI summaries, statistics, charts or dashboards.

The goal is operational overview, not analytics.

### Overall Layout

At the very top of the page there is one horizontal information bar spanning the full width. It is divided into two sections.

**Left section** — Shows today's operational overview. This is NOT statistics. This is a quick list showing: employee name, today's assigned work, location, current checklist progress.

Example:

```
6/7  • Max West • Grass cutting • Hospital
4/5  • Paul Novak • Bathroom renovation • Ljubljana
2/3  • Adam Smith • Cleaning • Office building
```

The owner should immediately understand: who is working, where they are, how far they have progressed. No graphs. No KPI widgets. No charts. No counters.

**Right section** — Shows only one highlighted urgent situation. Only the single highest priority issue.

Example:

```
NUJNO

Bathroom renovation

Traffic accident near Celje.

Estimated delay:
45 minutes.
```

This area exists only for exceptional situations requiring immediate attention.

### Three Main Columns

#### COLUMN 1 — DANES - TEREN

This column represents all employees working in the field. Each employee has one daily work card. These are daily operational cards, NOT project cards. The office creates these cards every day. Each card is assigned to exactly one employee.

Creating the card automatically establishes the communication channel between: Employee ↔ Office. No other communication relationships exist.

**Purpose**: This column helps the office monitor field work. Workers report: progress, delays, issues, completed work. Everything is centered around the daily card.

**Card Content**

Each card contains: employee, job title, location, working hours, checklist progress.

Below that, show only: last two completed checklist items, next two remaining checklist items. Do NOT display the entire checklist here.

Completed checklist items display the completion time. Remaining checklist items do not.

**Attachment Indicator**

Some checklist items may require evidence. The office can enable an attachment icon for specific checklist items. The icon simply indicates: "This step requires uploading photos or documents."

The worker can upload: photos, PDF documents, files.

Not every checklist item has this icon. Only those selected by the office. Exactly as shown in the original design reference.

**Opening a Card**

Clicking the card opens Job Details. Job Details show: complete checklist, all uploaded files, complete timeline, communication section.

**Communication Options**

At the top of Job Details there are exactly four communication actions. No more.

1. **Voice-to-text** — The worker speaks for up to 15 seconds. Speech is transcribed into text. The transcription becomes part of the Job history.
2. **Internal message** — Maximum: 400 characters. Also stored in Job history.
3. **Phone** — Opens the phone dialer. Calls the other participant directly. No call history is stored inside the application.
4. **Email** — Opens the default email application. Uses the email address of the other participant. No email history is stored inside the application.

**Communication Rules**

Communication is strictly vertical.

Allowed: Employee ↔ Office, Employee ↔ Manager, Manager ↔ Employee

Not allowed: Employee ↔ Employee

There is never direct messaging between field workers. If Worker A wants something from Worker B, the request goes through the office.

#### COLUMN 2 — DANES - PISARNA

Workers never see this column. This column is visible only to: owner, manager, office staff, secretary.

**Purpose**: This column replaces dozens of unnecessary phone calls. It contains: reminders, daily office tasks, appointments, accounting reminders, things that must not be forgotten. These are NOT work cards. These are office reminders.

**Reminder Cards**

Cards may contain: meeting, phone call, document signing, invoice reminder, customer follow-up, internal office note, etc.

**Action Icons**

Each reminder card may display between zero and four action icons. The office chooses which icons are shown. There are eight available action types in the system. A reminder card displays only the icons selected for that reminder. Do NOT render the same fixed icons on every card. The icon layout must behave exactly like the original design reference.

Examples include: phone, email, attachment, confirm, reject, open link, calendar, location — (Only the icons assigned to that reminder are displayed.)

**Reminder Action Icons**

Each Office Reminder stores its enabled actions as an array of predefined action identifiers.

Example:

```json
[
  "phone",
  "email",
  "attachment",
  "calendar"
]
```

The frontend renders only the icons contained in this array. No fixed icon layout exists.

**Urgent Reminders**

Urgent reminders display: red "NUJNO" badge. They DO NOT require a colored vertical border.

**Important**

Office reminder cards do NOT display: employee name, worker information, job assignment. Those belong only to field cards.

#### COLUMN 3 — KOMUNIKACIJA

This column shows communication between field workers and office.

**Card Structure**

Each communication entry is attached to the original work card. Therefore: the work card header is always shown first. Immediately below it: the communication message. These two sections visually belong together. Do NOT separate them into unrelated cards. The manager must instantly know which work card the communication belongs to.

**Message Types**

Only two internal communication types are stored: Voice-to-text, Internal message

Phone calls and emails are external communication methods. They are NOT stored in history.

**Purpose**

This is intentionally lightweight communication. Internal messages are for: updates, delays, questions, short information. Long discussions should happen by phone.

**Timeline**

Every internal message is attached to the daily Job. The complete communication history remains attached to that Job. This creates accountability and makes later review possible.

**Column Behaviour**

Cards may be reordered vertically inside their own column. Example: The manager may drag cards higher or lower.

Cards may NEVER move between columns. Each column has a fixed purpose.

**Communication Column Rules**

- The Communication column displays all active internal message cards.
- A communication card remains visible until the user explicitly dismisses it using the X button.
- Deleting a communication card does NOT delete the underlying messages. All messages remain permanently stored.
- If the final visible message is dismissed, the communication card disappears from the Communication column.
- The related Daily Work Card remains unchanged.
- Every dismissal creates a Timeline event.

### Design Rules

- Apple-inspired
- Minimal
- Large whitespace
- Soft pastel backgrounds
- Rounded cards
- Subtle shadows
- Clear typography
- No clutter
- No unnecessary decoration
- Card backgrounds must visually stand out from the column background
- Columns use subtle tinted backgrounds
- Cards remain white
- Urgent states use restrained red accents

### Strict Constraints

Do NOT add: statistics, charts, AI summaries, KPI widgets, search bars, analytics, additional columns, notifications panel, calendars, extra dashboard widgets

The application is intentionally simple. Its purpose is to help the owner understand daily operations in seconds and communicate efficiently with a small team, not to provide enterprise analytics.

---

## DESKTOP DASHBOARD — CARD CREATION & USER INTERACTION

### General Principle

The dashboard is designed to be extremely simple. Creating cards should require minimal input. There are only three card types:

1. Field Work Card (TEREN)
2. Office Reminder Card (PISARNA)
3. Communication Card (generated automatically)

The user never creates Communication cards manually.

### Field Work Card (TEREN)

Only the Owner, Manager, or Office Staff can create these cards. Each card represents one employee's work for one day. These are daily work cards, not project cards.

**Required Fields**

The following fields are mandatory: Job / Project name, Location, Customer, Date, Assigned employee (dropdown list)

The employee dropdown contains all active workers. Only one worker may be assigned to a single card.

**Save Behaviour**

After pressing Save: the card is automatically created; it is inserted at the top of the TEREN column; communication between the assigned employee and the office becomes available immediately.

The manager may later drag the card higher or lower inside the TEREN column. Cards may never move to another column.

**Checklist Management**

After creating the card, the office may add today's checklist items. Checklist items represent today's planned work only.

The office may: add checklist items, edit checklist items, remove checklist items, reorder checklist items — at any time during the day.

**Attachment Requirement**

Each checklist item may optionally require evidence. When creating or editing a checklist item, the office may enable an attachment requirement. If enabled, an attachment icon is displayed next to that checklist item. The worker may then upload: photos, PDF documents, other supported files.

If attachment is not required, no icon is displayed.

### Office Reminder Card (PISARNA)

Only the Owner, Manager or Office Staff may create these cards. Workers never see this column. These cards are reminders, not work assignments.

**Required Field**: Only one field is mandatory — Reminder title

**Optional Fields**: The office may optionally enter a short description (maximum 80 characters) used to briefly explain the reminder.

**Date and Time**: Optional. If no date is entered, the reminder belongs to today. If a future date is entered, the reminder becomes visible only on that day.

**Urgent Badge**: Optional checkbox. When enabled, display a red badge: NUJNO. This visually highlights the reminder.

**Action Icons**

Each reminder may contain between zero and five action icons. Icons are selected by the office during creation. Only selected icons are shown.

**Available Actions**

- **Attachment** — When selected: The office may upload one or more files. The manager can later open these files directly from the reminder.
- **Phone** — When selected: The office enters a phone number. Later, the manager clicks the phone icon. The system immediately opens the device dialer using that stored number. No manual copying is required.
- **Confirm** — When selected: The manager may press the confirmation icon. The icon changes to its active state. This acts as confirmation back to the office.
- **Reject** — When selected: The manager may press the reject icon. The icon changes to its active state. This indicates rejection or refusal.

**Additional Optional Actions**: The system may support additional predefined action icons in the future. The office simply selects which icons should appear. No custom icon creation is allowed.

**Save Behaviour**: After pressing Save, the reminder appears immediately inside the PISARNA column. Cards may later be reordered vertically.

**Removing Reminder Cards**: Reminder cards display a standard close button (X) in the upper-right corner. Clicking X removes the reminder from the active dashboard. The reminder is not deleted permanently. It remains stored in the historical archive.

### Communication Column (KOMUNIKACIJA)

Users never create communication cards directly. They are generated automatically.

**Creating Communication**

Communication always starts from a Field Work card. The manager opens the card details. At the top of Job Details there are exactly four communication options.

**Voice-to-Text**

Maximum recording time: 15 seconds.

Typical examples: "We have run out of paint.", "Ask Max to bring more screws.", "The work is finished."

After recording: Speech is automatically converted into text. The transcription is stored in the Job history. The communication appears immediately inside the KOMUNIKACIJA column. The receiving user receives an instant notification.

**Internal Message**

Maximum length: 400 characters.

After pressing Send: The message is stored immediately. The recipient receives an instant notification. The message appears in the KOMUNIKACIJA column.

**Phone**

Clicking the phone icon opens the device dialer. Calls are external. Phone calls are not stored in the application history.

**Email**

Clicking the email icon opens the default email application. The recipient address is automatically filled in. Email conversations are not stored inside the application.

**Notification Behaviour**

Whenever a Voice message or Internal Message is sent: the recipient receives an immediate notification; the notification opens the related Job; the communication is stored in Job history.

When the office creates a new reminder in the PISARNA column: The manager also receives an immediate notification.

**Automatic Top Summary**

The top information bar is generated automatically. Users never edit it manually.

**Left Side**: Generated from active Field Work cards. Displays: employee, today's work, location, checklist progress

**Right Side**: Generated automatically. Displays the highest priority reminder marked NUJNO. Only one urgent reminder is shown.

### Job Details Screen

Clicking anywhere on a Field Work card opens the Job Details page. Exception: Clicking directly on icons performs the icon action instead.

**Job Details Layout**

Sections always appear in the same order.

**1. Communication**

The communication section is always displayed first. Both manager and worker have identical communication options: Voice-to-Text, Internal Message, Phone, Email

**2. Full Checklist**

The dashboard card shows only: last two completed items, next two remaining items.

Inside Job Details: Display the complete checklist. Workers complete checklist items by tapping them. Completion immediately updates the dashboard. No additional notification is generated.

**3. Attachments**

Display every attachment uploaded during that day's work. Examples: photos, PDFs, documents

**4. History / Timeline**

The final section displays the complete history (Timeline). Every event is recorded chronologically. Examples include: checklist completion, uploaded files, voice messages, internal messages, sender, timestamp, related job

The Timeline is read-only and cannot be modified.

---

## SUBSCRIPTIONS & BILLING (MVP — STRIPE + PAYPAL)

### 1. Core Principle

The application does not depend on the selected payment provider. Access is determined solely by:

```
subscription_active = true / false
```

No payment-provider-specific logic may affect access control.

### 2. Supported Payment Providers

Supported in MVP: **Stripe**, **PayPal**

Both providers are fully supported and behave identically from a backend logic perspective. The application never distinguishes between providers when deciding access.

### 3. Plan Model

Single plan: **€59 / month**

Annual subscription: implemented in payment providers, disabled by default, can be enabled later without application architecture changes

No multiple tiers.

### 4. Coupons / Discounts

No internal coupon system. Discounts are fully handled by providers: Stripe Promotion Codes, PayPal provider-side discounts. No application-level discount logic exists.

**Rule**: Discount handling is entirely delegated to the payment provider.

### 5. Checkout Flow

Backend-only responsibility. Backend creates: Stripe Checkout Session, PayPal Checkout flow/session. Frontend only redirects to returned URL.

**Rule**: Frontend MUST NOT create checkout sessions directly.

### 6. Billing Management

Stripe: Managed via Stripe Customer Portal

PayPal: Managed via user's PayPal account

Backend returns correct redirect URL for each provider. Frontend only redirects.

### 7. Customer Mapping

Each Company has exactly one billing identity.

Stored fields: `subscription_active`, `stripe_customer_id`, `stripe_subscription_id`, `paypal_subscription_id`, `subscription_status (optional provider status)`

Rules: Only one active subscription provider may exist per Company at any time; historical provider IDs may remain stored after migration; access is determined only by `subscription_active`

### 8. Billing Ownership

- Subscription belongs to Company
- Users inherit access through Company
- Users never own subscriptions individually

### 9. Webhook System

Required providers: Stripe webhooks, PayPal webhooks. Both providers use the same backend processing model.

### 10. Webhook Security

All webhook requests MUST be signature verified. Unverified requests MUST be rejected immediately.

### 11. Webhook Processing Rules

Webhook processing MUST be: idempotent, safe to execute multiple times, free of duplicate state changes.

### 12. Webhook Events (MVP)

**Stripe**: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

**PayPal**: `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.EXPIRED`

Only provider-confirmed subscription events may update billing state. The application ignores all other provider webhook events.

### 13. Payment Failure Rule

Temporary payment failures MUST NOT immediately revoke access. Access changes only after the payment provider confirms subscription is no longer active.

Access is NEVER inferred from: failed payments, retry attempts, invoice events

### 14. Access Control Rule

Only this field controls application access: `subscription_active`

Everything else is informational only.

### 15. Subscription Status Mapping

Regardless of payment provider, provider status is mapped into: `subscription_active = true / false`

Examples: active → true; cancelled → false; expired → false; suspended → false

Backend performs all provider-to-application mapping.

### 16. Checkout Safety Rule

All checkout sessions MUST be created by the backend. Frontend never interacts directly with Stripe or PayPal SDKs for checkout creation. Frontend only redirects to backend-provided URLs.

### 17. Extensibility Rule

The billing system is provider-agnostic. Additional payment providers may be added later without changing: access control, authorization logic, core application behavior.

Core rule always remains: `subscription_active`

### 18. Final System Guarantee

The billing system guarantees:

- identical application behavior for Stripe and PayPal
- backend is the sole authority for subscription state
- no payment-provider-specific business logic
- no provider lock-in
- one unified access model
- company-based subscriptions only
- backend-controlled checkout
- backend-verified webhooks
- deterministic access via subscription_active

---

## APPENDIX A — DEVELOPER IMPLEMENTATION REFERENCE (MVP)

### 1. Core Entity Clarification (Critical)

The Foundation defines exactly one operational entity: **JOB**

A Daily Work Card is NOT a database entity. It is strictly a UI representation of a Job.

**HARD RULE**

- 1 Job = 1 Daily Work Card
- No separate Daily Work Card table exists
- No separate Daily Work Card API exists
- No duplicated lifecycle or status systems
- All business logic is Job-centric

### 2. Database ERD (MVP)

(unchanged — same structure as Foundation specification)

**HARD RULE**: The ERD defined in the Foundation specification is the authoritative database structure. No additional entities may be introduced. No additional relationships may be introduced. Existing relationships MUST NOT be modified. Database structure MUST remain consistent with the Foundation ERD.

### 3. API Surface (MVP)

**Jobs**

```
POST   /jobs
GET    /jobs
GET    /jobs/{id}
PATCH  /jobs/{id}
```

**Checklist**

```
GET    /jobs/{id}/checklist
PATCH  /checklist-items/{id}
```

**Files**

```
POST   /jobs/{id}/files
GET    /jobs/{id}/files
```

File rules:

- Files are immutable in MVP.
- There is NO DELETE endpoint.
- File removal in the UI does NOT delete the file from storage.
- If a user removes a file in the UI, the file is only hidden from that user's default view.
- Hidden files remain stored in both the database and object storage.
- A `file_hidden` Timeline event is created to preserve user action history.
- File visibility does NOT affect file ownership or integrity.
- Files always remain attached to their original Job.

**Timeline**

```
GET    /jobs/{id}/timeline
```

Timeline rules:

- Timeline is append-only.
- Timeline events are generated only by backend business logic.
- Timeline records are immutable.
- Timeline ordering is enforced by backend responses.
- Frontend MUST display Timeline in the order returned by the backend.

**Messages (Job-Bound Only)**

```
POST   /jobs/{id}/messages
GET    /jobs/{id}/messages
PATCH  /jobs/{id}/messages/read
GET    /messages/unread-count
```

Message rules:

- Messages are immutable business records.
- No DELETE endpoint exists.
- Messages always belong to exactly one Job.
- No global messaging system exists.
- User-created text messages generate the `message_sent` Timeline event.
- System-generated voice transcription messages MUST NOT generate `message_sent`.

**Notifications**

```
GET    /notifications
PATCH  /notifications/{id}/read
```

Notification rules:

- Notifications are persistent records.
- No DELETE endpoint exists in MVP.
- If a user removes a notification from the UI, it is only hidden for that user.
- A `notification_deleted` Timeline event represents the user's hide action only.
- No notification record is deleted from the database.
- Read/unread state is independent from hidden state.

**OCR (Automatic Only)**

OCR is NOT an API feature.

Rules:

- OCR is triggered automatically after a successful file upload.
- OCR starts only after the uploaded file has been successfully stored and the corresponding `job_files` database record has been created.
- OCR result is stored as the Timeline event `ocr_completed`.
- No manual OCR endpoint exists.
- OCR execution is fully backend-controlled.

**Voice-to-Text**

```
POST /jobs/{id}/voice-message
```

Rules:

- Maximum duration: 15 seconds
- Audio is not persisted as a message resource.
- No audio entity exists.
- System automatically generates the transcription.
- Only the transcription becomes a Message.
- Exactly one Message is created per request.
- Timeline event: `voice_message_transcribed`
- This endpoint returns the created Message resource.
- This endpoint does NOT return or store audio data.

**Authentication**

```
POST /auth/login
POST /auth/logout
GET  /auth/me
```

Auth rule: Authentication uses Bearer JWT tokens. All authenticated endpoints require a valid JWT. Backend is the sole authority for authentication and authorization decisions.

**HTTP Rules**

- Successful POST requests MUST return the created resource.
- Successful PATCH requests MUST return the updated resource.
- Standard HTTP status codes MUST be used consistently across the API.
- API responses MUST be deterministic for identical requests.

### 4. Timeline Event Types (Closed Set)

Only the following Timeline event types are allowed:

`job_created`, `job_updated`, `worker_assigned`, `status_changed`, `checklist_completed`, `image_uploaded`, `document_uploaded`, `message_sent`, `voice_message_transcribed`, `ocr_completed`, `file_hidden`, `notification_deleted`, `job_completed`

Rules:

- No additional Timeline event types may be introduced.
- Timeline events are generated exclusively by backend business logic.
- Every Timeline event belongs to exactly one Job.
- Timeline events are immutable once created.
- Internal processing steps (image optimization, compression, validation, storage operations, etc.) MUST NOT generate Timeline events.
- `notification_deleted` represents a user hide action only and does NOT delete the underlying notification record.

### 5. Authorization & Security

Authorization is enforced exclusively by the backend.

Rules:

- UI visibility does NOT grant permissions.
- Frontend MUST NOT enforce business authorization logic.
- Backend is the single source of truth for access control.
- Every request MUST be validated against the authenticated user.
- Authorization is evaluated before any business operation is executed.
- Invalid authorization MUST terminate request processing immediately.

### 6. Company Isolation (Hard Rule)

Every authenticated user belongs to exactly one Company.

Rules:

- Every query MUST filter by `company_id`.
- Every mutation MUST validate `company_id`.
- File access MUST validate `company_id`.
- Timeline access MUST validate `company_id`.
- Message access MUST validate `company_id`.
- Checklist access MUST validate `company_id`.
- No cross-company access is allowed under any circumstances.
- Even valid UUID access MUST be rejected if a Company mismatch exists.
- Company isolation is enforced entirely by the backend.

### 7. Default Ordering

If ordering is not explicitly specified, the following defaults MUST be used.

- **Jobs** → `scheduled_at ASC`, then `created_at DESC`
- **Timeline** → `created_at ASC`
- **Messages** → `created_at ASC`
- **Files** → `created_at DESC`
- **Checklist** → `order_index ASC`
- **Notifications** → `created_at DESC`

Ordering rules: Backend MUST apply default ordering. Frontend MUST NOT reorder data unless explicitly requested by the user. Default ordering ensures deterministic API responses.

### 8. Permission Model

If a permission is not explicitly granted, it is forbidden.

This includes, but is not limited to: deleting messages, deleting files, modifying completed Jobs, reopening completed Jobs

Rules: Backend is the sole authority for permission evaluation. Frontend MAY hide unavailable actions for usability but MUST NOT enforce permissions. Permission checks MUST occur before executing any state-changing operation.

### 9. File Access

Files are accessed exclusively through the application API.

Rules:

- No direct storage access assumptions are allowed.
- Storage implementation is abstracted from the frontend.
- Only non-hidden files are returned by default list endpoints.
- Hidden files remain stored in both the database and object storage.
- File visibility never changes file ownership.
- File access always requires successful authorization.

### 10. System Consistency Rules

**Data Ownership**

- Job is the primary business entity.
- Files always belong to a Job.
- Messages always belong to a Job.
- Timeline events always belong to a Job.
- Checklist items always belong to a Job.
- No independent operational entities may be introduced.

**Immutability**

The following business records are immutable: Messages, Files, Timeline events

Updates may change visibility or read state where explicitly allowed, but MUST NOT modify historical business content.

**Backend Authority**

The backend is responsible for: authentication, authorization, business validation, timeline generation, storage coordination, timestamp generation

Frontend responsibilities are limited to: presenting data, collecting user input, displaying API responses

### 11. Implementation Principles (MVP)

The MVP intentionally avoids additional architectural complexity.

The implementation MUST NOT introduce: background workflow engines, event buses, distributed processing, lifecycle engines, audit reconstruction systems, file versioning, soft-delete frameworks, standalone messaging modules, standalone file management modules, standalone Timeline modules

Business behavior is implemented directly through the defined API surface and backend services.

### 12. Final Implementation Rule

This Appendix defines the implementation constraints for the MVP. If behavior is not explicitly defined:

1. follow the Foundation specification
2. follow this Appendix
3. keep implementation deterministic
4. do not introduce additional business concepts
5. do not extend the architecture beyond the MVP scope

**✔ Final Status**

This Appendix defines: the backend implementation model, the API surface, business ownership rules, authorization model, Timeline behavior, Company isolation, implementation constraints, and deterministic default behavior required for the MVP. No additional architectural layers, enterprise infrastructure, or alternative implementations should be introduced unless the Foundation specification is explicitly revised.

---

## APPENDIX B — UI & IMPLEMENTATION REFERENCE (MVP) — FINAL

### 1. UI Navigation Map (MVP)

**Application Navigation Structure**

```
LOGIN
│
▼
Desktop Dashboard
│
├────────────► Daily Work Card (UI representation of Job)
│              │
│              ├── Overview
│              ├── Checklist
│              ├── Files
│              ├── Messages
│              └── Timeline
│
├────────────► Office Reminder
│              │
│              └── Reminder Details
│
├────────────► Communication Card
│              (UI-only entry point)
│              │
│              └── Always resolves to related Daily Work Card
│
└────────────► Notifications
```

**Mobile Worker Flow**

```
LOGIN
│
▼
My Daily Work Card
│
▼
Checklist
│
├── Complete checklist item
├── Upload photo
├── Upload document
├── Voice-to-text (max 15 seconds)
├── Internal message
└── Timeline
```

**Manager Flow**

```
Dashboard
│
▼
Create Job
│
▼
Assign Worker
│
▼
Create Checklist
│
▼
Worker performs work
│
▼
Office monitors progress
│
▼
Communication
│
▼
Timeline
│
▼
Complete Job
```

**Communication Flow**

```
Dashboard
│
▼
Communication Column
│
▼
Communication Card
(UI-only entry point)
│
▼
Daily Work Card
│
▼
Messages
│
▼
Timeline
```

**Navigation Rules**

*Primary Navigation*

- Dashboard is the primary application entry after successful login.
- Dashboard is always the root of operational navigation.
- Navigation returns to Dashboard when leaving a Daily Work Card unless explicitly defined otherwise.

*Daily Work Card*

Daily Work Card is the only operational workspace in the application. It represents exactly one Job.

Daily Work Card contains the following sections: Overview, Checklist, Files, Messages, Timeline

Daily Work Card has: no independent database entity, no independent API, no independent lifecycle, no independent permissions

All business operations execute on the underlying Job.

*Communication Card*

Communication Card exists only for user convenience.

Rules: UI-only component; no backend representation; no database entity; no API endpoint; no persistence; no independent identifier; always resolves to exactly one Job; always opens the corresponding Daily Work Card

Communication Card must never become an operational entity.

*Navigation Constraints*

Navigation MUST NEVER bypass the Daily Work Card.

There is: no standalone Messages page, no standalone Files page, no standalone Timeline page, no standalone Checklist page

All operational data is accessed exclusively through the related Daily Work Card.

*Navigation Authority*

- Dashboard is the application root.
- Daily Work Card is the operational workspace.
- Communication Card is a navigation shortcut only.
- Every operational action starts from and returns to a Daily Work Card.
- No additional operational navigation hierarchy may be introduced.

*UI Responsibilities*

The frontend is responsible for: presenting navigation, opening the correct Daily Work Card, rendering data returned by backend, preserving navigation consistency

The frontend is not responsible for: business authorization, workflow decisions, business state transitions, permission evaluation, storage logic

Those responsibilities belong exclusively to the backend.

### 2. Empty States (MVP)

**Global Rule**: All user-facing text MUST be in Slovenian.

Empty states communicate that the application is functioning correctly but currently contains no data for the requested view. Empty states MUST be visually distinguishable from loading states and error states.

**Dashboard**

- *Ni kartic za delo* — Za danes še ni ustvarjenih delovnih kartic.
- *Ni opomnikov* — Trenutno ni ustvarjenih opomnikov.
- *Ni komunikacij* — Danes še ni nobenih komunikacij iz terena. Sporočila iz delovnih kartic bodo prikazana tukaj.

**Daily Work Card**

- *Ni seznama opravil* — Seznam nalog še ni bil ustvarjen.
- *Ni datotek* — Datoteke še niso bile naložene.
- *Ni sporočil* — Ni novih sporočil.
- *Ni časovnice* — Za to kartico še ni zabeleženih dogodkov.

**Files**

- *Ni fotografij* — Fotografije še niso bile naložene.
- *Ni dokumentov* — Dokumenti še niso bili naloženi.

**Notifications**

- *Ni obvestil* — Trenutno ni novih obvestil.

Notification removal represents a per-user hidden state only. Notifications remain stored in the system.

**Search**

- *Ni zadetkov* — Iskanje ni vrnilo rezultatov.

**Error Loading Data**

- Podatkov ni bilo mogoče naložiti. Poskusite znova.
- Button: Poskusi znova

**Access Denied**

- Za dostop do te vsebine nimate dovoljenja.

This screen is shown only after backend authorization has denied access. Frontend does not determine permissions.

**Offline (Optional)**

- Ni internetne povezave. Spremembe bodo samodejno poslane, ko bo povezava ponovno vzpostavljena.

Offline mode is optional for the MVP. If implemented, synchronization behavior remains fully controlled by backend APIs.

**Empty State Rules**

Every empty state MUST:

- contain a clear explanatory message
- use Slovenian language
- use the same visual layout as the surrounding UI
- preserve normal page spacing
- avoid placeholder tables
- avoid placeholder cards
- clearly communicate that no data currently exists

**Empty State vs Loading**

Loading state is not an empty state. Loading placeholders MUST: disappear immediately after successful API response; never display empty-state messages; never display error messages; indicate that data retrieval is still in progress.

Empty states are displayed only after the backend has successfully returned an empty result.

**Empty State vs Error**

An empty state is not an error.

Use empty states only when: request completed successfully; backend returned no data

Use error states only when: API request failed; authorization failed; unexpected server error occurred; network request could not be completed

**Retry Behavior**

Retry actions are allowed only for recoverable failures. In the MVP, the "Poskusi znova" button is used only on data-loading errors. Empty states must never include retry actions.

**UI Language Rules**

All visible application text MUST be written in Slovenian. This includes: empty states, buttons, labels, validation messages, notifications, dialogs, confirmations, error messages

Developer comments, API documentation and internal code remain in English.

**Final Rule**

An empty state indicates the successful absence of data. It MUST NEVER be used to represent: loading, authorization failures, server errors, network failures

Each of those states requires its own dedicated UI.

---

## APPENDIX B — PART 3: DEVELOPER IMPLEMENTATION NOTES (FINAL MVP)

### 1. Job vs Daily Work Card

- 1 Job = 1 Daily Work Card
- Daily Work Card is strictly a UI representation of a Job
- No separate entity exists for Daily Work Card
- No separate API exists for Daily Work Card
- No duplicated lifecycle, status system or state machine

**Implementation Rule**: All backend operations MUST operate on Job entity only. Daily Work Card is purely a presentation layer abstraction.

### 2. Immutable Records

The following entities are immutable business records: Messages, Files, Timeline events

Rules:

- No DELETE endpoints exist for business data
- No UPDATE of existing records (except controlled status fields where explicitly defined in API)
- Any UI delete action MUST only hide the item from the user
- Hidden items remain in database and storage

File-specific rules:

- Files remain stored in Supabase Storage (or configured provider)
- Files remain referenced in `job_files` table
- Hidden files are excluded from default GET responses
- Hidden files can only be returned when explicitly requested with authorization

### 3. OCR Processing

OCR is fully automatic and backend-controlled.

Rules:

- OCR is triggered automatically after successful file upload
- OCR is NOT an API feature
- No manual OCR endpoint exists
- OCR output is stored ONLY as a Timeline event

Timeline Event: `ocr_completed`

**Important Rule**: Only backend may generate timeline events. Frontend must never create or infer OCR results.

### 4. Voice-to-Text

Voice-to-text is a controlled system workflow.

Rules:

- Maximum audio duration: 15 seconds
- Audio is NOT stored as a persistent resource
- Only transcribed text is stored as a message
- Exactly one message is created per voice input
- Message is system-generated

Timeline Event: `voice_message_transcribed`

**Critical Consistency Rule**: System-generated messages DO NOT trigger `message_sent`; DO NOT behave like user-created messages. Only user-created text messages trigger `message_sent`.

### 5. Messages Event Rule

- `message_sent` applies ONLY to user-created text messages
- System-generated messages (voice-to-text) are excluded
- Messages remain immutable after creation

**Ordering Rule**: Messages MUST always be displayed: `created_at ASC`

### 6. Default Ordering

If ordering is not explicitly defined by API, the following rules apply:

- Jobs → `scheduled_at ASC`, then `created_at DESC`
- Timeline → `created_at ASC`
- Messages → `created_at ASC`
- Files → `created_at DESC`
- Checklist → `order_index ASC`
- Notifications → `created_at DESC`

**Rule**: Frontend MUST NOT override default ordering unless explicitly allowed by API response.

### 7. Notifications

Notifications are persistent system records.

Rules:

- Notifications are never deleted in MVP
- Notifications have read/unread state only
- UI removal = per-user hidden state only
- Hidden notifications remain in database

Timeline Behavior: Notification deletion in UI triggers `notification_deleted` but does NOT remove the record.

### 8. Database Relationships

**Strict Rule**: All database relationships MUST strictly follow the ERD defined in Foundation.

Forbidden: adding additional foreign keys not defined in ERD, creating implicit relationships in frontend, extending schema with undocumented relations, duplicating Job-related structures (e.g. Daily Work Card tables)

Allowed: joins defined by ERD only, backend-controlled relational queries only

**Final Part 3 Summary**

This system is: Job-centric (single source of truth), backend-authoritative, immutable for business records, strictly event-limited (Timeline closed set). UI is a projection layer only.

---

## APPENDIX B — PART 4: DEVELOPER IMPLEMENTATION NOTES (FINAL MVP)

### 9. Navigation

Navigation is strictly hierarchical and Job-centric.

Rules:

- Dashboard is the root entry point
- All operational flows MUST pass through Daily Work Card
- Daily Work Card is the only operational workspace
- No alternative operational entry points are allowed

Forbidden: direct navigation to Messages without Job context, direct navigation to Files without Job context, direct navigation to Timeline without Job context

Reason: This ensures all business logic is always scoped to a single Job.

### 10. Permission Model

Permissions are fully backend-controlled.

**Core Rule**: If permission is not explicitly granted → it is forbidden.

Includes (non-exhaustive MVP set): deleting messages, deleting files, modifying completed jobs, reopening completed jobs, accessing cross-company data

**Critical Rule**: Frontend MUST NEVER implement business permission logic.

Frontend only: renders backend response, hides UI elements based on backend-provided state

Backend is the ONLY authority.

### 11. Loading States

Loading state is NOT empty state.

Rules:

- Loading indicates ongoing API request
- Empty state indicates successful response with no data
- Error state indicates failed request

UI Separation Requirement — Each state MUST be visually distinct:

- Loading → skeleton / spinner
- Empty → Slovenian empty message
- Error → retry message

**Rule**: Frontend must never convert loading into empty state.

### 12. File Access

File access is strictly API-controlled.

Rules:

- Files are NEVER accessed directly from storage URLs in frontend
- Frontend never constructs storage paths
- All file access goes through backend or signed URLs
- Only non-hidden files are returned in list endpoints

Supabase Specific Rule — If Supabase Storage is used: access MUST be via signed URLs only; URLs are generated by backend; frontend cannot generate or cache permanent URLs

Hidden Files — hidden files remain in database; hidden files remain in storage; hidden files are excluded from default API responses

### 13. Authentication

Authentication is JWT Bearer based.

Rules:

- All endpoints require authentication
- Backend validates JWT on every request
- Backend resolves user context from token
- No client-side trust assumptions allowed

Endpoints:

```
POST /auth/login
POST /auth/logout
GET /auth/me
```

**Rule**: All timestamps and ownership metadata are generated server-side only.

### 14. Company Isolation (Critical Global Rule)

Company isolation is mandatory and absolute.

Rules:

- every query MUST include `company_id` filter
- no cross-company data access is allowed
- even valid UUIDs must be rejected if company mismatch exists

Applies to: Jobs, Files, Messages, Timeline, Notifications, Checklist, Users (where applicable)

Rule Enforcement: This is a backend-only enforcement rule. Frontend must NOT assume isolation — it must rely on backend filtering.

### 15. Timeline Events (Closed Set)

Only the following events are allowed:

`job_created`, `job_updated`, `worker_assigned`, `status_changed`, `checklist_completed`, `image_uploaded`, `document_uploaded`, `message_sent`, `voice_message_transcribed`, `ocr_completed`, `job_completed`

**Hard Rule**: No additional event types may ever be introduced in MVP. Timeline is a closed system.

Rule Enforcement: backend is sole event emitter; frontend cannot create timeline events; external services cannot extend event types

### 16. HTTP Responses

Standard HTTP semantics MUST be followed.

Rules:

- POST → returns created resource
- PATCH → returns updated resource
- GET → returns requested resource
- DELETE → NOT part of MVP

Consistency Rule: All endpoints MUST return: predictable structure, backend-generated timestamps, validated entity state

### Final System Summary (Appendix B)

This system is defined by:

**Architecture Principles**

- Job is the only core entity
- Daily Work Card is UI-only abstraction
- Backend is single source of truth
- Frontend is rendering layer only

**Data Rules**

- immutable business records (messages, files, timeline)
- no deletion model in MVP
- strict company isolation
- strict ERD adherence

**Event System**

- closed timeline event set
- backend-only event emission
- no extensibility in MVP

**Storage**

- Supabase Storage = passive object store only
- signed URLs only
- no direct frontend storage access

**Security**

- backend-enforced permissions
- JWT-based authentication
- zero frontend trust assumptions

### Final Line

This specification defines a deterministic MVP system with:

- no ambiguity in ownership
- no client-side business logic
- no mutable history of core records
- strict backend authority over all state transitions