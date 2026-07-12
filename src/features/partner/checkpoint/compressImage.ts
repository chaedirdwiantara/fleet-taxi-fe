const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.8;

/**
 * Re-encodes a camera/gallery photo to an upload-friendly JPEG: longest edge
 * capped at 1920px, quality 0.8 (~200–500KB for a typical phone photo).
 * `imageOrientation: 'from-image'` bakes the EXIF rotation into the pixels,
 * and re-encoding strips all EXIF metadata (including GPS) as a side effect.
 */
export async function compressImage(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D tidak tersedia');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) throw new Error('Gagal mengompres gambar');
    return blob;
  } finally {
    bitmap.close();
  }
}
