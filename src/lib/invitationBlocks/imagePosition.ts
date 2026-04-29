import type { ImagePosition } from "./types";

/**
 * Convert any ImagePosition (legacy string or new 0..100 number) into a CSS
 * `object-position` / `background-position` Y component (e.g. "50%", "0%").
 * Defaults to centered when undefined.
 */
export function imagePositionToCss(v: ImagePosition | undefined): string {
  if (typeof v === "number") {
    const clamped = Math.max(0, Math.min(100, v));
    return `${clamped}%`;
  }
  if (v === "top") return "0%";
  if (v === "bottom") return "100%";
  return "50%";
}
