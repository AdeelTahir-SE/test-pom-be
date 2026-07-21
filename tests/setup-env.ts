// Loads .env.local into process.env before test files run, so tests that
// talk to Supabase directly (via @/lib/supabase/admin) have credentials.
import { existsSync } from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  // Node 20.6+/22+: process.loadEnvFile(). Does not override already-set vars.
  (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(envPath);
}
