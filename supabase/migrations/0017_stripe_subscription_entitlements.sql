-- Store enough Stripe subscription state to honor paid-through access after
-- a customer schedules cancellation at period end.

alter table public.companies
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_cancel_at_period_end boolean not null default false,
  add column if not exists subscription_cancel_at timestamptz,
  add column if not exists subscription_canceled_at timestamptz;
