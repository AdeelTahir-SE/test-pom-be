import mammoth from "mammoth";
import * as XLSX from "xlsx";

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx + 1).toLowerCase();
}

export function isOfficeDocument(filename: string): boolean {
  return ["doc", "docx", "xls", "xlsx"].includes(extensionOf(filename));
}

/**
 * Direct text extraction for Word/Excel — never rasterize for OCR (Mark).
 * DOC/DOCX via mammoth; XLS/XLSX via SheetJS. Returns null on any failure
 * so upload enrichment stays best-effort (same rule as Mistral OCR).
 */
export async function extractOfficeText(
  buffer: Buffer,
  fileName: string
): Promise<string | null> {
  const ext = extensionOf(fileName);
  try {
    if (ext === "docx" || ext === "doc") {
      // mammoth targets DOCX; legacy .doc often fails — null is fine.
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value ?? "").trim();
      return text.length > 0 ? text : null;
    }

    if (ext === "xlsx" || ext === "xls") {
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const parts: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        parts.push(`# ${sheetName}`);
        const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
        if (csv.trim()) parts.push(csv.trim());
      }
      const text = parts.join("\n").trim();
      return text.length > 0 ? text : null;
    }

    return null;
  } catch {
    return null;
  }
}
