import mammoth from "mammoth";
import * as XLSX from "xlsx";

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx + 1).toLowerCase();
}

export function isOfficeDocument(filename: string): boolean {
  return ["doc", "docx", "xls", "xlsx", "txt"].includes(extensionOf(filename));
}

/**
 * Direct text extraction for Office/TXT documents. Returns null on any failure
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

    if (ext === "txt") {
      const text = buffer.toString("utf8").replace(/\u0000/g, "").trim();
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

    console.log("[ocr] Unsupported direct document extraction type", { fileName, extension: ext });
    return null;
  } catch (error) {
    console.log("[ocr] Office/TXT extraction error", {
      fileName,
      extension: ext,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
