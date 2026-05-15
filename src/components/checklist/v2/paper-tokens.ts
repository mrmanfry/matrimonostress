/* Shared design tokens / helpers for the Checklist paper redesign.
   Colors reference HSL semantic tokens from index.css (--paper-*). */

import type { TaskMacroCategory } from "@/lib/taskCategories";

export const P = {
  bg:           "hsl(var(--paper-bg))",
  surface:      "hsl(var(--paper-surface))",
  surfaceMuted: "hsl(var(--paper-surface-muted))",
  surfaceSunk:  "hsl(var(--paper-sunk))",
  border:       "hsl(var(--paper-border))",
  borderStrong: "hsl(var(--paper-border-strong))",
  ink:          "hsl(var(--paper-ink))",
  ink2:         "hsl(var(--paper-ink-2))",
  ink3:         "hsl(var(--paper-ink-3))",
  brand:        "hsl(var(--paper-brand))",
  brandInk:     "hsl(var(--paper-brand-ink))",
  brandTint:    "hsl(var(--paper-brand-tint))",
  success:      "hsl(var(--paper-success))",
  successTint:  "hsl(var(--paper-success-tint))",
  warn:         "hsl(var(--paper-warn))",
  warnTint:     "hsl(var(--paper-warn-tint))",
  danger:       "hsl(var(--paper-danger))",
  dangerTint:   "hsl(var(--paper-danger-tint))",
  info:         "hsl(var(--paper-info))",
  infoTint:     "hsl(var(--paper-info-tint))",
  gold:         "hsl(var(--paper-gold))",
  goldTint:     "hsl(var(--paper-gold-tint))",
  goldBorder:   "hsl(var(--paper-gold-border))",
  fontUI:       "'Inter', system-ui, sans-serif",
  fontSerif:    "'Fraunces', Georgia, serif",
  fontMono:     "'JetBrains Mono', ui-monospace, monospace",
  shadowSm:     "0 1px 2px rgba(43,37,32,.04), 0 1px 1px rgba(43,37,32,.03)",
  shadow:       "0 1px 2px rgba(43,37,32,.04), 0 8px 24px -12px rgba(43,37,32,.10)",
  shadowLg:     "0 2px 4px rgba(43,37,32,.04), 0 24px 48px -16px rgba(43,37,32,.14)",
};

export const PRIO_MAP: Record<string, { label: string; dot: string; tint: string; border: string; fg: string }> = {
  high:   { label: "Alta",  dot: "#B91C1C", tint: P.dangerTint,  border: "#EBCFCF", fg: P.danger  },
  medium: { label: "Media", dot: "#D4A017", tint: P.warnTint,    border: "#ECD9B7", fg: P.warn    },
  low:    { label: "Bassa", dot: "#15803D", tint: P.successTint, border: "#C8E2CF", fg: P.success },
};

export interface AreaCfg {
  id: TaskMacroCategory;
  label: string;
  iconKey: "fileText" | "church" | "utensils" | "sparkles" | "briefcase" | "tag" | "truck";
  color: string;
  tint: string;
  border: string;
}

export const AREA_CONFIGS: AreaCfg[] = [
  { id: "amministrativo", label: "Amministrativo", iconKey: "fileText",  color: P.info,    tint: P.infoTint,    border: "#CBDAF4" },
  { id: "cerimonia",      label: "Cerimonia",      iconKey: "church",    color: P.brandInk, tint: P.brandTint,   border: "#E3D9FB" },
  { id: "ricevimento",    label: "Ricevimento",    iconKey: "utensils",  color: P.gold,    tint: P.goldTint,    border: P.goldBorder },
  { id: "look",           label: "Look & Stile",   iconKey: "sparkles",  color: "#BE185D", tint: "#FCE7F3",     border: "#F9A8D4" },
  { id: "fornitori",      label: "Fornitori",      iconKey: "briefcase", color: P.success, tint: P.successTint, border: "#C8E2CF" },
  { id: "logistica",      label: "Logistica",      iconKey: "truck",     color: "#C2410C", tint: "#FFEDD5",     border: "#FED7AA" },
  { id: "altro",          label: "Altro",          iconKey: "tag",       color: P.ink2,    tint: P.surfaceMuted, border: P.border },
];

export function areaById(id?: string | null): AreaCfg {
  return AREA_CONFIGS.find((a) => a.id === id) || AREA_CONFIGS[AREA_CONFIGS.length - 1];
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export type RelKind = "overdue" | "today" | "urgent" | "soon" | "later" | "none";
export function relDue(dateStr: string | null | undefined): { kind: RelKind; label: string } {
  const n = daysUntil(dateStr);
  if (n === null) return { kind: "none", label: "" };
  if (n < 0) return { kind: "overdue", label: `Scaduto ${Math.abs(n)}g fa` };
  if (n === 0) return { kind: "today", label: "Oggi" };
  if (n <= 7) return { kind: "urgent", label: `⏰ ${n} ${n === 1 ? "giorno" : "giorni"}` };
  if (n <= 30) return { kind: "soon", label: `${n} giorni` };
  return { kind: "later", label: `${n} giorni` };
}

export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export function ownerColor(owner?: string | null, partner1?: string, partner2?: string): { label: string; color: string } {
  if (!owner) return { label: "Entrambi", color: "#8B5CF6" };
  if (partner1 && owner === partner1) return { label: partner1, color: "#BE185D" };
  if (partner2 && owner === partner2) return { label: partner2, color: "#1D4ED8" };
  return { label: owner, color: "#6B7280" };
}
