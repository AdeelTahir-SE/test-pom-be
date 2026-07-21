// One-off dev/ops tool to bootstrap platform admins (see plan.md §3.1).
// There is no API endpoint for this by design — nothing may authorize
// creating the first one, so it's a direct-to-Supabase CLI, same pattern
// as the spec's "manual DB fix by developer" for business-module correction.
//
// Usage: node --env-file=.env.local scripts/create-platform-admin.mjs <email> <password>

import { createClient } from "@supabase/supabase-js";

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error(
      "Usage: node --env-file=.env.local scripts/create-platform-admin.mjs <email> <password>"
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const db = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId;
  const { data: createdUser, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    if (/already.*registered|already exists/i.test(createError.message)) {
      const { data: list, error: listError } = await db.auth.admin.listUsers();
      if (listError) throw listError;
      const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!existing) {
        throw new Error(`Auth reports "${email}" exists but it was not found in listUsers().`);
      }
      userId = existing.id;
      console.log(`Auth user already exists, reusing id ${userId}`);
    } else {
      throw createError;
    }
  } else {
    userId = createdUser.user.id;
    console.log(`Created auth user ${userId}`);
  }

  const { error: upsertError } = await db
    .from("platform_admins")
    .upsert({ id: userId, email }, { onConflict: "id" });
  if (upsertError) throw upsertError;

  console.log(`Platform admin ready: ${email} (${userId})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
