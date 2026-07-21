import { z } from "zod";
import { withAuth } from "@/lib/http/handler";
import { ok, ApiError } from "@/lib/http/responses";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

// GET /api/users/[id] — owner/manager view a single user within their own company.
export const GET = withAuth<{ id: string }>(
  async (_request, auth, { params }) => {
    const db = getAdminClient();
    const { data: userRow, error } = await db
      .from("users")
      .select("id, email, full_name, role, phone, is_active, created_at")
      .eq("id", params.id)
      .eq("company_id", auth.companyId)
      .maybeSingle();

    if (error) {
      throw new ApiError("internal", "Failed to load user.", error.message);
    }
    if (!userRow) {
      throw new ApiError("not_found", "User not found.");
    }
    return ok({ user: userRow });
  },
  { roles: ["owner", "manager"] }
);

// Role is restricted to manager|worker: the spec allows exactly one owner per
// company (Registration Flow §12), so ownership is never reassigned via this endpoint.
const updateUserSchema = z
  .object({
    full_name: z.string().trim().min(1).optional(),
    role: z.enum(["manager", "worker"]).optional(),
    is_active: z.boolean().optional(),
    phone: z.string().trim().min(1).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field must be provided.",
  });

// PATCH /api/users/[id] — owner-only (User Management, permission matrix §12).
export const PATCH = withAuth<{ id: string }>(
  async (request, auth, { params }) => {
    const input = await parseJsonBody(request, updateUserSchema);

    if (params.id === auth.userId && input.is_active === false) {
      throw new ApiError("bad_request", "You cannot deactivate your own account.");
    }

    const db = getAdminClient();

    const { data: existing, error: existingError } = await db
      .from("users")
      .select("id, role")
      .eq("id", params.id)
      .eq("company_id", auth.companyId)
      .maybeSingle();

    if (existingError) {
      throw new ApiError("internal", "Failed to load user.", existingError.message);
    }
    if (!existing) {
      throw new ApiError("not_found", "User not found.");
    }
    if (existing.role === "owner") {
      throw new ApiError("forbidden", "The owner account cannot be modified through this endpoint.");
    }

    const { data: updated, error: updateError } = await db
      .from("users")
      .update(input)
      .eq("id", params.id)
      .eq("company_id", auth.companyId)
      .select("id, email, full_name, role, phone, is_active, created_at")
      .single();

    if (updateError || !updated) {
      throw new ApiError("internal", "Failed to update user.", updateError?.message);
    }

    return ok({ user: updated });
  },
  { roles: ["owner"] }
);
