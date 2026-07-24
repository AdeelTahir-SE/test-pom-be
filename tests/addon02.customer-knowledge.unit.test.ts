import { describe, it, expect } from "vitest";
import {
  findDuplicateNote,
  normalizeCustomerName,
  normalizeNoteText,
  type CustomerNoteRow,
} from "@/lib/services/customers";

function note(partial: Partial<CustomerNoteRow> & { note: string }): CustomerNoteRow {
  return {
    id: partial.id ?? "n1",
    company_id: "c1",
    customer_id: "cust1",
    note: partial.note,
    created_by: "u1",
    created_at: partial.created_at ?? "2026-01-01T00:00:00Z",
    updated_at: partial.updated_at ?? "2026-01-01T00:00:00Z",
  };
}

describe("Add-on 2 — customer name normalization", () => {
  it("trims, collapses spaces, and lowercases", () => {
    expect(normalizeCustomerName("  Novak   d.o.o. ")).toBe("novak d.o.o.");
    expect(normalizeCustomerName("NOVAK D.O.O.")).toBe("novak d.o.o.");
  });

  it("normalizes note text the same way for duplicate checks", () => {
    expect(normalizeNoteText("  Side  entrance  ")).toBe("side entrance");
  });
});

describe("Add-on 2 — duplicate note detection", () => {
  it("finds exact matches ignoring case and whitespace", () => {
    const existing = [note({ id: "a", note: "Always use the side entrance." })];
    expect(findDuplicateNote(existing, "always  use the side entrance.")?.id).toBe("a");
  });

  it("returns null when notes differ", () => {
    const existing = [note({ note: "Ring the bell twice" })];
    expect(findDuplicateNote(existing, "Use the side entrance")).toBeNull();
  });

  it("returns null for blank candidates", () => {
    expect(findDuplicateNote([note({ note: "x" })], "   ")).toBeNull();
  });
});
