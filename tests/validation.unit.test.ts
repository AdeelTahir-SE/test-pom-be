import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseJsonBody } from "@/lib/validation/schemas";

describe("parseJsonBody", () => {
  it("returns the first field-level validation message", async () => {
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: JSON.stringify({ worker_id: "not-a-uuid" }),
    });

    await expect(
      parseJsonBody(
        request,
        z.object({
          worker_id: z.string().uuid("Izberite veljavnega terenskega delavca."),
        })
      )
    ).rejects.toMatchObject({
      code: "bad_request",
      message: "Izberite veljavnega terenskega delavca.",
    });
  });
});
