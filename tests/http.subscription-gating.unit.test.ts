import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/env", () => ({
  env: { stripeEnforceSubscription: true },
}));

vi.mock("@/lib/auth/context", () => ({
  getAuthContext: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@/lib/stripe/subscription", () => ({
  billingAccessFromStoredState: vi.fn(() => false),
}));

import { getAuthContext } from "@/lib/auth/context";
import { getAdminClient } from "@/lib/supabase/admin";
import { withAuth } from "@/lib/http/handler";

const mockedGetAuthContext = vi.mocked(getAuthContext);
const mockedGetAdminClient = vi.mocked(getAdminClient);

function routeParams() {
  return { params: Promise.resolve({}) };
}

function inactiveCompanyDb() {
  const update = vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  }));
  return {
    from: vi.fn((table: string) => {
      if (table !== "companies") throw new Error(`Unexpected table ${table}`);
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: {
                  subscription_active: false,
                  subscription_status: "canceled",
                  subscription_current_period_end: null,
                  subscription_cancel_at_period_end: false,
                  subscription_cancel_at: null,
                },
              })
            ),
          })),
        })),
        update,
      };
    }),
  };
}

describe("withAuth subscription gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthContext.mockResolvedValue({
      kind: "company_user",
      userId: "user_1",
      companyId: "company_1",
      role: "owner",
      email: "owner@example.com",
    });
    mockedGetAdminClient.mockReturnValue(inactiveCompanyDb() as never);
  });

  it("allows read-only GET APIs for inactive companies", async () => {
    const handler = withAuth(async () => NextResponse.json({ ok: true }));

    const res = await handler(new Request("http://local.test/api/jobs"), routeParams());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("blocks protected mutation APIs for inactive companies", async () => {
    const handler = withAuth(async () => NextResponse.json({ ok: true }));

    const res = await handler(
      new Request("http://local.test/api/jobs", { method: "POST" }),
      routeParams()
    );

    expect(res.status).toBe(402);
  });
});
