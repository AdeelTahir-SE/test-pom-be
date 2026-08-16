import { describe, expect, it } from "vitest";
import { normalizeDocumentDate } from "@/lib/documents/date";

describe("document date normalization", () => {
  it("normalizes common numeric formats to DD.MM.YYYY", () => {
    expect(normalizeDocumentDate("23.03.2013")).toBe("23.03.2013");
    expect(normalizeDocumentDate("23. 03. 2013")).toBe("23.03.2013");
    expect(normalizeDocumentDate("23/03/2013")).toBe("23.03.2013");
    expect(normalizeDocumentDate("23-03-13")).toBe("23.03.2013");
    expect(normalizeDocumentDate("2013-03-23")).toBe("23.03.2013");
  });

  it("normalizes month-name formats", () => {
    expect(normalizeDocumentDate("23 Mar 2013")).toBe("23.03.2013");
    expect(normalizeDocumentDate("March 23, 2013")).toBe("23.03.2013");
    expect(normalizeDocumentDate("23 marca 2013")).toBe("23.03.2013");
    expect(normalizeDocumentDate("23 marzo 2013")).toBe("23.03.2013");
  });

  it("rejects invalid dates", () => {
    expect(normalizeDocumentDate("31.02.2025")).toBeNull();
  });
});
