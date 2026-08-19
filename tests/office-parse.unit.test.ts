import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { extractOfficeText, isOfficeDocument } from "@/lib/documents/officeParse";

describe("Office document text extract (Mark — no OCR rasterize)", () => {
  it("recognizes Word and Excel extensions", () => {
    expect(isOfficeDocument("a.docx")).toBe(true);
    expect(isOfficeDocument("a.doc")).toBe(true);
    expect(isOfficeDocument("a.xlsx")).toBe(true);
    expect(isOfficeDocument("a.xls")).toBe(true);
    expect(isOfficeDocument("a.txt")).toBe(true);
    expect(isOfficeDocument("a.pdf")).toBe(false);
    expect(isOfficeDocument("a.png")).toBe(false);
  });

  it("extracts cell text from xlsx without OCR", async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Zadeva", "Montaža"],
      ["Kupac", "Novak d.o.o."],
      ["Datum", "12.06.2025"],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "List1");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const text = await extractOfficeText(buffer, "quote.xlsx");
    expect(text).toBeTruthy();
    expect(text).toContain("Zadeva");
    expect(text).toContain("Novak d.o.o.");
    expect(text).toContain("List1");
  });

  it("returns null for garbage docx bytes (upload still succeeds elsewhere)", async () => {
    const text = await extractOfficeText(Buffer.from("not-a-docx"), "broken.docx");
    expect(text).toBeNull();
  });

  it("extracts txt content without OCR", async () => {
    const text = await extractOfficeText(
      Buffer.from("Račun št.: 12\nKupec: Novak d.o.o.", "utf8"),
      "invoice.txt"
    );
    expect(text).toContain("Račun št.: 12");
    expect(text).toContain("Novak d.o.o.");
  });
});
