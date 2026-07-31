-- Atomic Google (and similar) registration: company + owner in one transaction.
-- Prevents orphan companies if the users insert fails mid-flight.

create or replace function public.create_company_with_owner(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_company_name text,
  p_business_module text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.companies%rowtype;
  v_user public.users%rowtype;
begin
  if exists (select 1 from public.users where id = p_user_id) then
    raise exception 'USER_ALREADY_REGISTERED' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.platform_admins where id = p_user_id) then
    raise exception 'PLATFORM_ADMIN_FORBIDDEN' using errcode = 'P0001';
  end if;

  insert into public.companies (name, business_module)
  values (p_company_name, p_business_module)
  returning * into v_company;

  insert into public.users (id, company_id, email, full_name, role, is_active)
  values (p_user_id, v_company.id, lower(p_email), p_full_name, 'owner', true)
  returning * into v_user;

  return jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'full_name', v_user.full_name,
      'role', v_user.role
    ),
    'company', jsonb_build_object(
      'id', v_company.id,
      'name', v_company.name,
      'business_module', v_company.business_module
    )
  );
end;
$$;

revoke all on function public.create_company_with_owner(uuid, text, text, text, text) from public;
grant execute on function public.create_company_with_owner(uuid, text, text, text, text) to service_role;
