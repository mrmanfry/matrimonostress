// Curated palette for guest groups (paper-style, warm/elegant).
// Falls back deterministically when more groups than colors.
export const GROUP_PALETTE = [
  "#B08A3E", // gold
  "#6D3FE0", // brand
  "#D97706", // amber
  "#15803D", // success green
  "#1D4ED8", // info blue
  "#B91C1C", // danger red
  "#0F766E", // teal
  "#9333EA", // purple
  "#BE185D", // pink
  "#A16207", // ochre
];

export const FALLBACK_COLOR = "#8A8071"; // ink-3-ish neutral

/** Map group id -> color, deterministic by sorted id list */
export function buildGroupColorMap(groupIds: string[]): Record<string, string> {
  const sorted = [...new Set(groupIds)].sort();
  const map: Record<string, string> = {};
  sorted.forEach((id, i) => {
    map[id] = GROUP_PALETTE[i % GROUP_PALETTE.length];
  });
  return map;
}

export function colorForGroup(
  groupId: string | null | undefined,
  map: Record<string, string>
): string {
  if (!groupId) return FALLBACK_COLOR;
  return map[groupId] || FALLBACK_COLOR;
}
