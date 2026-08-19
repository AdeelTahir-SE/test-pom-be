import { z } from "zod";
import { ALLOWED_BUSINESS_MODULES } from "@/config/business-modules";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  company_name: z.string().trim().min(1, "Company name is required."),
  full_name: z.string().trim().min(1).optional(),
  business_module: z.enum(
    ALLOWED_BUSINESS_MODULES as unknown as [string, ...string[]]
  ),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** Step 2 of Google registration (no password — identity already from OAuth). */
export const googleRegisterSchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required."),
  full_name: z.string().trim().min(1).optional(),
  business_module: z.enum(
    ALLOWED_BUSINESS_MODULES as unknown as [string, ...string[]]
  ),
});
export type GoogleRegisterInput = z.infer<typeof googleRegisterSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Parses a request body against a schema; throws a formatted ApiError on failure.
// Callers (route handlers) catch via toErrorResponse.
import { ApiError } from "@/lib/http/responses";

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError("bad_request", "Request body must be valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const message = firstIssue?.message?.trim() || "Invalid request body.";
    throw new ApiError(
      "bad_request",
      message,
      result.error.flatten()
    );
  }
  return result.data;
}
