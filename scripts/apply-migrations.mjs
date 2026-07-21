// One-off local dev tool: applies all SQL files in supabase/migrations, in
// filename order, against DATABASE_URL. Tracks applied files in a
// `schema_migrations` table so re-running is a no-op for already-applied files.
// Not part of the deployed app — dev/CI tooling only.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL. Set it in .env.local.");
    process.exit(1);
  }

  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        filename   text primary key,
        applied_at timestamptz not null default now()
      );
    `);

    const { rows } = await client.query(
      "select filename from public.schema_migrations"
    );
    const applied = new Set(rows.map((r) => r.filename));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip  (already applied): ${file}`);
        continue;
      }
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      console.log(`apply: ${file}`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          "insert into public.schema_migrations (filename) values ($1)",
          [file]
        );
        await client.query("commit");
        console.log(`  ok: ${file}`);
      } catch (err) {
        await client.query("rollback");
        throw new Error(`Migration failed: ${file}\n${err.message}`);
      }
    }

    console.log("All migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
