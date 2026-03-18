/**
 * Convert any image blob (e.g. WebP) to JPEG via Canvas API.
 */
export async function convertToJpeg(blob: Blob): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(blob);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  URL.revokeObjectURL(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92)
  );
}
