/**
 * Camera Filters — client-side Canvas processing for Memories Reel.
 * Applies vintage/bw/warm/classic filters and compresses to WebP.
 */

export type FilmType = "vintage" | "bw" | "warm" | "classic" | "none";

/** Max dimension for output images */
const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.75;
const JPEG_QUALITY = 0.80;

/** Cached WebP support detection */
let _webpSupported: boolean | null = null;

/** Check if browser supports WebP encoding via canvas */
export function canEncodeWebP(): boolean {
  if (_webpSupported !== null) return _webpSupported;
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    _webpSupported = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    _webpSupported = false;
  }
  return _webpSupported;
}

/** Returns the output MIME type and file extension based on browser support */
export function getOutputFormat(): { mime: string; ext: string } {
  return canEncodeWebP()
    ? { mime: "image/webp", ext: "webp" }
    : { mime: "image/jpeg", ext: "jpg" };
}

/**
 * Takes an image source (HTMLVideoElement, HTMLImageElement, or File/Blob),
 * applies a filter, compresses to WebP, and returns a Blob.
 */
export async function processPhoto(
  source: HTMLVideoElement | HTMLImageElement | Blob,
  filmType: FilmType = "vintage"
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  let img: HTMLImageElement | HTMLVideoElement;

  if (source instanceof Blob) {
    img = await blobToImage(source);
  } else {
    img = source;
  }

  // Get source dimensions
  const srcW = img instanceof HTMLVideoElement ? img.videoWidth : img.naturalWidth;
  const srcH = img instanceof HTMLVideoElement ? img.videoHeight : img.naturalHeight;

  // Scale down if needed
  const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  canvas.width = w;
  canvas.height = h;

  // Draw source
  ctx.drawImage(img, 0, 0, w, h);

  // Apply filter
  applyFilter(ctx, w, h, filmType);

  // Export as WebP
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to export canvas to blob"));
      },
      "image/webp",
      WEBP_QUALITY
    );
  });
}

function applyFilter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  filmType: FilmType
) {
  if (filmType === "none") return;

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  switch (filmType) {
    case "vintage": {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        data[i] = Math.min(255, r * 1.1 + 20);
        data[i + 1] = Math.min(255, g * 0.95 + 10);
        data[i + 2] = Math.min(255, b * 0.8);
      }
      // Add slight vignette
      addVignette(ctx, w, h, 0.3);
      break;
    }
    case "bw": {
      for (let i = 0; i < data.length; i += 4) {
        const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        // Boost contrast slightly
        const val = Math.min(255, Math.max(0, (avg - 128) * 1.2 + 128));
        data[i] = data[i + 1] = data[i + 2] = val;
      }
      break;
    }
    case "warm": {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * 1.08 + 10);
        data[i + 1] = Math.min(255, data[i + 1] * 1.02);
        data[i + 2] = Math.max(0, data[i + 2] * 0.9 - 5);
      }
      break;
    }
    case "classic": {
      // Slight desaturation + warm tone
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const avg = (r + g + b) / 3;
        const mix = 0.7; // 70% original, 30% desaturated
        data[i] = Math.min(255, (r * mix + avg * (1 - mix)) * 1.05 + 8);
        data[i + 1] = Math.min(255, g * mix + avg * (1 - mix));
        data[i + 2] = Math.min(255, (b * mix + avg * (1 - mix)) * 0.92);
      }
      addVignette(ctx, w, h, 0.2);
      break;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function addVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number
) {
  const gradient = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.3,
    w / 2, h / 2, Math.max(w, h) * 0.7
  );
  gradient.addColorStop(0, `rgba(0,0,0,0)`);
  gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image from blob"));
    };
    img.src = url;
  });
}

/**
 * Returns CSS filter string for live preview (applied to <video>).
 */
export function getCSSFilter(filmType: FilmType): string {
  switch (filmType) {
    case "vintage":
      return "sepia(0.35) contrast(1.1) saturate(0.85) brightness(1.05)";
    case "bw":
      return "grayscale(1) contrast(1.2)";
    case "warm":
      return "sepia(0.15) saturate(1.2) brightness(1.05)";
    case "classic":
      return "sepia(0.1) saturate(0.9) contrast(1.05)";
    case "none":
    default:
      return "none";
  }
}
