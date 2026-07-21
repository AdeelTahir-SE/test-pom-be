import { detectImageFormat } from "@/lib/storage/image";
import { ApiError } from "@/lib/http/responses";

const OTHER_EXTENSIONS = ["doc", "docx", "txt"];

export interface ClassifiedUpload {
  attachmentType: "image" | "pdf" | "other";
  imageFormat?: "jpeg" | "png";
}

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx + 1).toLowerCase();
}

function isPdfMagicBytes(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

function looksLikeImage(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  return isJpeg || isPng;
}

// Backend-only classification (File Infrastructure §4: "Supported File
// Types: Images, PDF documents, ... Basic document files"). Images are
// verified from real binary headers via sharp; PDFs get a magic-byte check.
// Generic docs (doc/docx/txt) are opaque attachments never parsed by this
// backend, so they're trusted by extension.
export async function classifyUpload(filename: string, buffer: Buffer): Promise<ClassifiedUpload> {
  const ext = extensionOf(filename);

  if (["jpg", "jpeg", "png"].includes(ext) || looksLikeImage(buffer)) {
    const imageFormat = await detectImageFormat(buffer);
    return { attachmentType: "image", imageFormat };
  }

  if (ext === "pdf" || isPdfMagicBytes(buffer)) {
    if (!isPdfMagicBytes(buffer)) {
      throw new ApiError("bad_request", "File does not appear to be a valid PDF.");
    }
    return { attachmentType: "pdf" };
  }

  if (OTHER_EXTENSIONS.includes(ext)) {
    return { attachmentType: "other" };
  }

  throw new ApiError("bad_request", `Unsupported file type: .${ext || "unknown"}`);
}
