// Client-side photo compression for condition-report uploads. Walkthrough
// photos come straight from a phone camera (3–12 MB); resizing to ~1280px
// JPEG before upload keeps uploads fast on cellular and the finalized PDF
// (which embeds the photos in its annex) within the document size limit.

const MAX_DIM = 1280;
const QUALITY = 0.75;

export async function compressImage(file: File): Promise<Blob> {
  try {
    let bitmap: ImageBitmap;
    try {
      // from-image bakes the EXIF orientation into the pixels.
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    return blob ?? file;
  } catch {
    // Unsupported format or decode failure — send the original, the server
    // still enforces its own size cap.
    return file;
  }
}
