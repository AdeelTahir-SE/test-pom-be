-- Stripe launch paywall hardening.
-- Existing companies are intentionally not mass-updated here; review them
-- manually before enabling STRIPE_ENFORCE_SUBSCRIPTION in production.

alter table public.companies
  alter column subscription_active set default false;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);
