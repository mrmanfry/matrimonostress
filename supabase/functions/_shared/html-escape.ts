/**
 * Escape a string so it is safe to interpolate into HTML email bodies.
 * Prevents stored XSS / phishing via crafted database content.
 */
export function escHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
