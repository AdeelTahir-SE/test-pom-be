import { describe, it, expect } from "vitest";
import { api } from "./helpers/client";

// Phase 0 — foundation smoke tests.
// Requires the dev server running: `npm run dev` (and .env.local configured).

describe("Phase 0 — health & foundation", () => {
  it("GET /api/health returns 200 with an ok envelope", async () => {
    const res = await api.get<{ data: { status: string; db: { reachable: boolean } } }>(
      "/api/health"
    );
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });

  it("health reports Supabase reachable", async () => {
    const res = await api.get<{ data: { db: { reachable: boolean; detail: string } } }>(
      "/api/health"
    );
    expect(res.body.data.db.reachable).toBe(true);
  });

  it("unknown route returns 404", async () => {
    const res = await api.get("/api/does-not-exist");
    expect(res.status).toBe(404);
  });
});
