/**
 * URL Sanitizer
 *
 * Some external sources (social media scrapers, malformed ad links, browser
 * extensions) append serialized JSON state to our URLs, e.g.:
 *   /%22,%2231%22:true,%2238%22:[%7B%221%22:4%7D]...
 *
 * This module detects those malformed paths and redirects the browser to a
 * clean URL while preserving legitimate tracking parameters.
 */

const TRACKING_PARAM_ALLOWLIST = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "gad_source",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "ttclid",
  "li_fat_id",
  "ref",
];

/**
 * Returns true if the path or query contains serialized JSON-like garbage
 * (encoded quotes, braces, colons in suspicious positions).
 */
function looksLikeSerializedState(input: string): boolean {
  if (!input) return false;
  // Decoded forms
  const decoded = (() => {
    try {
      return decodeURIComponent(input);
    } catch {
      return input;
    }
  })();

  // Heuristics: presence of JSON-like fragments where they have no business being
  // (paths and query keys should never contain quotes, braces, or colons-in-brackets).
  const jsonLikeRe = /["{}\[\]]|%22|%7B|%7D|%5B|%5D/;
  if (!jsonLikeRe.test(input) && !jsonLikeRe.test(decoded)) return false;

  // Confirm: at least two suspicious tokens, OR a colon between digit-quoted keys
  const suspiciousCount =
    (input.match(/%22|%7B|%7D|%5B|%5D/g) || []).length +
    (decoded.match(/["{}\[\]]/g) || []).length;

  return suspiciousCount >= 2;
}

/**
 * Pulls out only the allowlisted tracking parameters from a query string.
 */
function extractTrackingParams(search: string): string {
  if (!search) return "";
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return "";
  }
  const clean = new URLSearchParams();
  for (const key of TRACKING_PARAM_ALLOWLIST) {
    const value = params.get(key);
    if (value && !looksLikeSerializedState(value)) {
      clean.set(key, value);
    }
  }
  const str = clean.toString();
  return str ? `?${str}` : "";
}

/**
 * Inspects window.location and, if it contains malformed serialized state,
 * rewrites the URL to a clean version (preserving only tracking params).
 *
 * Must be called BEFORE React Router mounts.
 */
export function sanitizeUrlIfNeeded(): void {
  if (typeof window === "undefined") return;

  const { pathname, search } = window.location;

  const pathDirty = looksLikeSerializedState(pathname);
  const searchDirty = looksLikeSerializedState(search);

  if (!pathDirty && !searchDirty) return;

  // Clean path: if dirty, reset to root. Otherwise keep as-is.
  const cleanPath = pathDirty ? "/" : pathname;
  const cleanSearch = searchDirty ? extractTrackingParams(search) : search;

  const cleanUrl = `${cleanPath}${cleanSearch}`;

  // Use replaceState so we don't pollute browser history
  window.history.replaceState(null, "", cleanUrl);

  // Optional: log for analytics visibility
  if (typeof console !== "undefined") {
    console.warn(
      "[urlSanitizer] Cleaned malformed URL. Original:",
      `${pathname}${search}`,
      "→",
      cleanUrl,
    );
  }
}
