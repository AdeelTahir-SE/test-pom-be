import { z } from "zod";
import { ApiError } from "@/lib/http/responses";

const cursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
});

export interface MessageCursor {
  createdAt: string;
  id: string;
}

export function clampMessageLimit(raw: string | null): number {
  if (!raw) return 40;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 40;
  return Math.max(1, Math.min(n, 100));
}

export function encodeMessageCursor(cursor: MessageCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeMessageCursor(raw: string | null): MessageCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return cursorSchema.parse(parsed);
  } catch {
    throw new ApiError("bad_request", "Invalid message cursor.");
  }
}

export function buildNextMessageCursor(
  rows: { created_at: string; id: string }[],
  limit: number
): { pageRows: typeof rows; nextCursor: string | null; hasMore: boolean } {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];
  return {
    pageRows,
    hasMore,
    nextCursor: hasMore && last ? encodeMessageCursor({ createdAt: last.created_at, id: last.id }) : null,
  };
}
