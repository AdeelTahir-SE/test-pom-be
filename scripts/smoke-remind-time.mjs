// Smoke test: remind_time column accepts writes (no dev server).
import pg from "pg";

const { Client } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const { rows: companies } = await client.query(
      "select id from public.companies order by created_at desc limit 1"
    );
    const companyId = companies[0]?.id;
    if (!companyId) {
      console.error("No company in DB — create one via app register first.");
      process.exit(1);
    }

    const { rows: users } = await client.query(
      "select id from public.users where company_id = $1 limit 1",
      [companyId]
    );
    const userId = users[0]?.id;
    if (!userId) {
      console.error("No user for company.");
      process.exit(1);
    }

    const title = `__remind_time_smoke_${Date.now()}`;
    const { rows: inserted } = await client.query(
      `insert into public.office_reminders
        (company_id, created_by, title, remind_time, order_index)
       values ($1, $2, $3, $4, 999999)
       returning id, remind_time, created_at`,
      [companyId, userId, title, "16:48"]
    );
    const row = inserted[0];
    if (row.remind_time !== "16:48") {
      throw new Error(`Expected remind_time 16:48, got ${row.remind_time}`);
    }

    await client.query("delete from public.office_reminders where id = $1", [row.id]);

    console.log("OK: remind_time column read/write works (16:48 stored, cleaned up).");
    console.log(`  sample created_at (server): ${row.created_at}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
