import sharp from "sharp";
import { ApiError } from "@/lib/http/responses";
import { LIMITS } from "@/config/constants";

export interface ProcessedImage {
  buffer: Buffer;
  extension: "jpg" | "png";
  contentType: "image/jpeg" | "image/png";
  width: number;
  height: number;
}

export interface ImagePipelineResult {
  main: ProcessedImage;
  thumbnail: ProcessedImage;
}

const THUMBNAIL_MAX_DIMENSION = 320;
const JPEG_QUALITY = 72; // spec: quality 70-75, single pass only — no iterative recompression

// Detects the REAL format from binary (Supabase Storage add-on §9: "Backend
// detects real MIME from binary" — never trust the client's declared type).
// Only JPEG/PNG are supported (Image Upload Service §2).
export async function detectImageFormat(buffer: Buffer): Promise<"jpeg" | "png"> {
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new ApiError("bad_request", "File is not a valid image.");
  }
  if (metadata.format !== "jpeg" && metadata.format !== "png") {
    throw new ApiError("bad_request", "Only JPEG and PNG images are supported.");
  }
  return metadata.format;
}

// Processing Pipeline (Image Upload Service §3): fix EXIF orientation, resize
// to at most 1920x1920, compress, single pass only. PNG with alpha stays PNG;
// everything else becomes JPEG (Compression Rules §5).
export async function processImage(
  buffer: Buffer,
  format: "jpeg" | "png"
): Promise<ImagePipelineResult> {
  const metadata = await sharp(buffer).metadata();
  const keepPng = format === "png" && (metadata.hasAlpha ?? false);

  // .rotate() with no args applies the EXIF orientation transform; since we
  // never call .withMetadata(), the output buffer has no EXIF at all —
  // this is what satisfies the mandatory metadata-strip requirement.
  const resized = sharp(buffer)
    .rotate()
    .resize({
      width: LIMITS.IMAGE_MAX_DIMENSION,
      height: LIMITS.IMAGE_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });

  const mainBuffer = keepPng
    ? await resized.png({ compressionLevel: 9 }).toBuffer()
    : await resized.jpeg({ quality: JPEG_QUALITY }).toBuffer();
  const mainMeta = await sharp(mainBuffer).metadata();

  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: THUMBNAIL_MAX_DIMENSION,
      height: THUMBNAIL_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
  const thumbMeta = await sharp(thumbBuffer).metadata();

  return {
    main: {
      buffer: mainBuffer,
      extension: keepPng ? "png" : "jpg",
      contentType: keepPng ? "image/png" : "image/jpeg",
      width: mainMeta.width ?? 0,
      height: mainMeta.height ?? 0,
    },
    thumbnail: {
      buffer: thumbBuffer,
      extension: "jpg",
      contentType: "image/jpeg",
      width: thumbMeta.width ?? 0,
      height: thumbMeta.height ?? 0,
    },
  };
}
