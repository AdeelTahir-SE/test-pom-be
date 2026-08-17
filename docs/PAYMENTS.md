# Payments And Billing

This document describes the current Stripe billing implementation: checkout, portal, webhook handling, entitlement storage, subscription gating, paywall UI, launch discount, and operational setup.

## Overview

Stripe is the payment provider. The app sells a monthly subscription through Stripe Checkout and manages ongoing subscription access through Stripe webhooks plus a server-side sync endpoint. A new account or an inactive account (in case of cancelling) can only see past data (if any is available) but cannot perform any action until they subscribe/pay through stripe. 

Key implementation files:

- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/portal/route.ts`
- `src/app/api/billing/status/route.ts`
- `src/app/api/billing/sync/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/lib/stripe/client.ts`
- `src/lib/stripe/billing.ts`
- `src/lib/stripe/subscription.ts`
- `src/lib/stripe/discount.ts`
- `src/lib/http/handler.ts`
- `src/components/dashboard/BillingRequired.tsx`

## Database Fields

Billing fields on `companies` are introduced in:

- `supabase/migrations/0006_stripe_billing.sql`
- `supabase/migrations/0016_stripe_launch_paywall.sql`
- `supabase/migrations/0017_stripe_subscription_entitlements.sql`

Stored company fields:

- `subscription_active`
- `stripe_customer_id`
- `stripe_subscription_id`
- `paypal_subscription_id`
- `subscription_status`
- `subscription_current_period_end`
- `subscription_cancel_at_period_end`
- `subscription_cancel_at`
- `subscription_canceled_at`

`0016_stripe_launch_paywall.sql` changes future company default access to inactive:

```sql
subscription_active default false
```

Registration also explicitly creates companies with `subscription_active: false` in `src/app/api/auth/register/route.ts`.

Webhook audit table:

```text
stripe_webhook_events
```

Fields:

- `event_id`
- `event_type`
- `processed_at`
- `error`
- `created_at`

This table is used for idempotency and audit.

## Environment Variables

Relevant env vars from `.env.example` and `src/lib/env.ts`:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_AUGUST_2026_COUPON_ID`
- `STRIPE_ENFORCE_SUBSCRIPTION`
- `NEXT_PUBLIC_APP_URL` or `APP_URL`

`STRIPE_ENFORCE_SUBSCRIPTION=true` enables API-level subscription enforcement.

`NEXT_PUBLIC_APP_URL` / `APP_URL` is used for Checkout success/cancel URLs and Billing Portal return URL.

Stripe SDK is initialized in `src/lib/stripe/client.ts` with API version:

```text
2026-06-24.dahlia
```

## Checkout

Endpoint:

`POST /api/billing/checkout`

Implemented in `src/app/api/billing/checkout/route.ts`.

Authorization:

- Owner only.

Flow:

1. Load company billing state with `loadCompanyBilling`.
2. Load owner email/full name.
3. Initialize Stripe.
4. Read `STRIPE_PRICE_ID_MONTHLY`.
5. Reuse stored `stripe_customer_id` if it still exists in Stripe.
6. If the stored customer is missing/deleted, create a new Stripe Customer.
7. Store the new customer ID on `companies`.
8. Build discount config.
9. Create a Stripe Checkout Session in `subscription` mode.
10. Return `{ url, session_id }`.

Checkout Session fields:

- `mode: "subscription"`
- `customer`
- `client_reference_id: company.id`
- `locale: "sl"`
- one line item using `STRIPE_PRICE_ID_MONTHLY`
- `success_url: {APP_URL}/dashboard/office?billing=success&session_id={CHECKOUT_SESSION_ID}`
- `cancel_url: {APP_URL}/dashboard/office?billing=cancel`
- `metadata.company_id`
- `subscription_data.metadata.company_id`

The frontend only redirects to Stripe. It does not call Stripe directly.

## Launch Discount

Discount logic is in:

- `src/lib/billing/launchDiscount.ts`
- `src/lib/stripe/discount.ts`

Discount window:

```text
2026-07-31T22:00:00.000Z <= now < 2026-08-31T22:00:00.000Z
```

During this window:

- Checkout passes `discounts: [{ coupon: STRIPE_AUGUST_2026_COUPON_ID }]`.
- Promotion codes are not enabled.

Outside this window:

- Checkout passes `allow_promotion_codes: true`.

If the discount is active but `STRIPE_AUGUST_2026_COUPON_ID` is missing, checkout returns a server config error.

## Billing Portal

Endpoint:

`POST /api/billing/portal`

Implemented in `src/app/api/billing/portal/route.ts`.

Authorization:

- Owner only.

Flow:

1. Load company billing state.
2. Require `stripe_customer_id`.
3. Create a Stripe Billing Portal session.
4. Return `{ url }`.

Portal settings:

- `customer: company.stripe_customer_id`
- `return_url: {APP_URL}/dashboard/office`
- `locale: "sl"`

If the stored Stripe customer is missing in Stripe, the route clears the stored Stripe customer/subscription fields, marks subscription inactive, and asks the user to start a new subscription.

## Billing Status

Endpoint:

`GET /api/billing/status`

Implemented in `src/app/api/billing/status/route.ts`.

Authorization:

- Owner
- Manager

Response:

- `subscription_active`
- `subscription_status`
- `subscription_current_period_end`
- `subscription_cancel_at_period_end`
- `subscription_cancel_at`
- `subscription_canceled_at`
- `has_stripe_customer`
- `has_stripe_subscription`

## Billing Sync

Endpoint:

`POST /api/billing/sync`

Implemented in `src/app/api/billing/sync/route.ts`.

Authorization:

- Owner only.

Purpose:

Webhooks are the source of truth, but sync handles the common launch/local-development case where Checkout succeeds and the user returns before the webhook has been delivered or processed.

Request:

```json
{
  "session_id": "cs_..."
}
```

Flow:

1. Retrieve the Checkout Session from Stripe with `expand: ["subscription"]`.
2. Ensure session mode is `subscription`.
3. Ensure session belongs to the current company via `metadata.company_id` or `client_reference_id`.
4. Ensure session status is `complete`.
5. Load the subscription.
6. Compute entitlement through `billingAccessFromStripeSubscription`.
7. Apply state to `companies` via `applyStripeSubscriptionState`.
8. Return updated status fields.

## Webhook Endpoint

Endpoint:

`POST /api/stripe/webhook`

Implemented in `src/app/api/stripe/webhook/route.ts`.

Runtime:

- Node.js runtime.
- Uses raw request body.
- Verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET`.

Production endpoint should be:

```text
https://YOUR_DOMAIN/api/stripe/webhook
```

For `pomocnik.net`:

```text
https://pomocnik.net/api/stripe/webhook
```

Do not point Stripe to:

- `/api/payment/webhook`
- `/be/api/payment/webhook`
- `/be/be/api/payment/webhook`

## Required Stripe Events

The current handler processes:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

For Stripe Dashboard setup, subscribe at least:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

`invoice.payment_succeeded` is also handled if Stripe sends it.

Generic payment events such as `charge.succeeded`, `payment_intent.succeeded`, and `payment_method.attached` are not needed for access control.

## Webhook Idempotency

Webhook event audit is implemented with `stripe_webhook_events`.

Flow:

1. Insert `event_id` and `event_type`.
2. If duplicate event already has `processed_at` and no error, return success with `{ duplicate: true }`.
3. If handler fails, store `error` and return 500 so Stripe retries.
4. If handler succeeds, set `processed_at` and clear `error`.

If the audit table is missing, the code logs `[stripe_webhook_audit_table_missing]` and continues without audit.

## Webhook Event Behavior

### checkout.session.completed

Behavior:

- Ignore non-subscription sessions.
- Resolve company ID from metadata/client reference/customer/subscription.
- Retrieve Stripe subscription.
- Apply subscription snapshot to company billing fields.

### customer.subscription.created / updated / deleted

Behavior:

- Resolve company by subscription metadata, stored subscription ID, or customer ID.
- For deleted event, override status to `canceled`.
- Compute entitlement snapshot.
- Apply state to company.

### invoice.paid / invoice.payment_succeeded / invoice.payment_failed

Behavior:

- Extract subscription ID from invoice.
- Retrieve latest subscription.
- Resolve company.
- Apply latest subscription snapshot.

Invoice events are reconciliation signals. Actual access is still driven by subscription state.

## Entitlement Computation

Entitlement logic lives in `src/lib/stripe/subscription.ts`.

Active Stripe statuses:

- `active`
- `trialing`
- `past_due`

Inactive Stripe statuses:

- `canceled`
- `unpaid`
- `incomplete_expired`
- `paused`
- `incomplete`

Cancellation behavior:

- `cancel_at_period_end = true` does not immediately remove access.
- Access remains active until `subscription_current_period_end`.
- If `subscription_cancel_at` exists and is in the past, access is inactive.
- If `cancel_at_period_end` is true and `current_period_end` is in the past, access is inactive.

This is why customers who cancel at period end can still use the app through their paid period.

## Applying Stripe State

State application lives in `src/lib/stripe/billing.ts`.

`applyStripeSubscriptionState` updates:

- `subscription_status`
- `subscription_active`
- `subscription_current_period_end`
- `subscription_cancel_at_period_end`
- `subscription_cancel_at`
- `subscription_canceled_at`
- `stripe_customer_id` when provided
- `stripe_subscription_id` when provided

`findCompanyIdForStripe` resolves company by:

1. `company_id` metadata
2. stored `stripe_subscription_id`
3. stored `stripe_customer_id`

## API Gating

Subscription enforcement is in `src/lib/http/handler.ts`.

When `STRIPE_ENFORCE_SUBSCRIPTION` is not true, no billing gate is applied.

When enabled:

- Billing/auth/health exempt paths remain available:
  - `/api/billing/*`
  - `/api/auth/me`
  - `/api/auth/logout`
  - `/api/auth/refresh`
  - `/api/health`
- For inactive companies, authenticated `GET` requests are allowed.
- For inactive companies, protected non-GET requests return payment required.

This supports read-only dashboards while blocking mutations.

Request-time reconciliation:

- If stored `subscription_active` is true but `billingAccessFromStoredState` says access has expired, the handler updates `subscription_active` to false.

## UI Behavior

Billing UI lives in `src/components/dashboard/BillingRequired.tsx`.

There are two UI modes:

### Full Screen Block

`BillingRequired`

Used for worker dashboard.

Behavior:

- Owner sees payment copy and Stripe checkout button.
- Manager/worker sees a locked message and optional office phone action.
- Logout is available.
- On `?billing=success&session_id=...`, polls/syncs billing activation.

### Read-Only Banner

`BillingLockBanner`

Used by owner/manager dashboard pages.

Behavior:

- Dashboard data remains visible.
- Mutating actions are disabled/guarded by the page.
- Owner sees Stripe checkout button.
- Manager sees owner-required copy.
- On successful return, calls `/api/billing/sync` first, then `/api/billing/status` polling.

Office pages apply local `billingLocked` guards around create/edit/delete/upload/send actions.

## Registration

Company registration creates a company with:

```ts
subscription_active: false
```

This is in `src/app/api/auth/register/route.ts`.

The owner can log in and see read-only/paywall UI, then start Checkout.

## Admin Visibility

Admin company pages expose billing status fields.

Relevant files:

- `src/app/admin/page.tsx`
- `src/app/api/admin/companies/route.ts`
- `src/app/api/admin/companies/[id]/route.ts`

Admin can manually toggle `subscription_active`. This is an operational override and does not change Stripe state.

## Stripe Dashboard Setup

For production:

1. Create product/price in the correct live Stripe account.
2. Set `STRIPE_PRICE_ID_MONTHLY` to the live recurring price.
3. Configure Billing Portal in Stripe Dashboard.
4. Create webhook endpoint:

```text
https://pomocnik.net/api/stripe/webhook
```

5. Subscribe the required subscription events.
6. Copy the live webhook signing secret to:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

7. Use live `STRIPE_SECRET_KEY`.
8. Set:

```env
STRIPE_ENFORCE_SUBSCRIPTION=true
```

Test-mode customers, coupons, prices, and webhook secrets do not work with live-mode keys, and vice versa.

## Multiple Products / Domains

The code is currently built around one Stripe configuration per deployment/environment:

- one `STRIPE_SECRET_KEY`
- one `STRIPE_PRICE_ID_MONTHLY`
- one webhook secret
- one app base URL

If separate domains/products must show separate branding and customer-facing billing portal details, the cleaner operational model is separate Stripe accounts or carefully separated Stripe environments per product deployment. Sharing one account can work only if branding, statement descriptors, portal configuration, products/prices, and webhook routing are acceptable for all products.

## Known Caveats

- Webhooks are required for durable subscription state. `/api/billing/sync` helps after Checkout success but is not a replacement for webhooks.
- The webhook audit table should be migrated before launch; otherwise the handler continues but idempotent audit is degraded.
- API gating is method-based: inactive companies can still call authenticated `GET` endpoints.
- UI locking is page-level and must be maintained wherever new mutating controls are added.
- `past_due` keeps access by policy.
- Scheduled cancellation keeps access until the paid period end.
- Admin manual override can diverge from Stripe until the next webhook/sync applies Stripe state again.
- The Billing Portal must be configured in Stripe Dashboard; the app only creates portal sessions.
