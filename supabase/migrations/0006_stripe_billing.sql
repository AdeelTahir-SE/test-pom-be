-- Stripe / billing fields on companies (Subscriptions & Billing add-on).
-- Access remains controlled solely by subscription_active.
-- Existing rows keep subscription_active = true so current tenants are not locked out.

alter table public.companies
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists paypal_subscription_id text,
  add column if not exists subscription_status text;

create unique index if not exists idx_companies_stripe_customer_id
  on public.companies (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists idx_companies_stripe_subscription_id
  on public.companies (stripe_subscription_id)
  where stripe_subscription_id is not null;
