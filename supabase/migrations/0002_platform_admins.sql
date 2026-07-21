-- =============================================================================
-- 0002_platform_admins.sql — Internal/ops oversight, added by explicit request.
--
-- Deliberately NOT part of the company-scoped RBAC (users.role) and NOT tied to
-- any company_id. A platform admin is a completely separate identity kind:
-- a user is either a company user (row in public.users) or a platform admin
-- (row in platform_admins) — never both. This keeps the Foundation's absolute
-- tenant-isolation guarantee unchanged for every company-scoped endpoint.
-- =============================================================================

create table if not exists public.platform_admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now()
);

-- Deny-by-default, same as every other table. The backend service-role key
-- bypasses this; enforcement happens in application code via withPlatformAdmin.
alter table public.platform_admins enable row level security;
