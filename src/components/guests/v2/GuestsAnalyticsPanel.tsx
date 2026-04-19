import { useMemo, useState } from "react";
import { BarChart3, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isGuestConfirmed, isGuestDeclined, isGuestPending } from "@/lib/rsvpHelpers";

/**
 * Editorial "Analisi" panel — paper-styled, ported 1:1 from the designer handoff
 * (libretti-messa/project/src/inv/analytics.jsx).
 *
 * BigStat (serif numerals) + RSVP/Menù mini bar charts + group distribution strip.
 * Computes its own metrics from the guests/parties already loaded by the page.
 */

interface Guest {
  id: string;
  is_couple_member?: boolean;
  is_child?: boolean;
  phone?: string | null;
  rsvp_status?: string | null;
  allow_plus_one?: boolean | null;
  menu_choice?: string | null;
  group_name?: string | null;
}

interface Party {
  id: string;
  guests: Guest[];
}

interface Props {
  guests: Guest[];
  parties: Party[];
  isMobile?: boolean;
  triggerLabel?: string;
}

// Stable palette for group chips (used in legend + stacked bar)
const GROUP_PALETTE = [
  "hsl(43 74% 49%)", // gold
  "hsl(258 90% 66%)", // violet
  "hsl(25 95% 53%)", // orange
  "hsl(142 71% 38%)", // green
  "hsl(217 91% 55%)", // blue
  "hsl(0 72% 51%)", // red
  "hsl(180 65% 40%)", // teal
  "hsl(330 75% 55%)", // pink
];

function groupColor(name: string, index: number): string {
  return GROUP_PALETTE[index % GROUP_PALETTE.length];
}

function normalizeMenu(raw: string | null | undefined): "adulto" | "bambino" | "veg" | "gluten" | "nessuno" {
  if (!raw) return "nessuno";
  const v = raw.toLowerCase();
  if (v.includes("bamb") || v.includes("kid") || v.includes("child")) return "bambino";
  if (v.includes("veg") || v.includes("vega")) return "veg";
  if (v.includes("glut")) return "gluten";
  if (v.includes("adult")) return "adulto";
  return "adulto";
}

export function GuestsAnalyticsPanel({ guests, parties, isMobile = false, triggerLabel = "Analisi dettagliata" }: Props) {
  const [open, setOpen] = useState(false);

  const metrics = useMemo(() => {
    const regular = guests.filter((g) => !g.is_couple_member);
    const total = regular.length;
    const adults = regular.filter((g) => !g.is_child).length;
    const children = regular.filter((g) => g.is_child).length;
    const withPhone = regular.filter((g) => !!g.phone).length;
    const confirmed = regular.filter((g) => isGuestConfirmed(g.rsvp_status)).length;
    const declined = regular.filter((g) => isGuestDeclined(g.rsvp_status)).length;
    const pending = regular.filter((g) => isGuestPending(g.rsvp_status)).length;
    const plusOnes = regular.filter((g) => !!g.allow_plus_one).length;

    const menus = { adulto: 0, bambino: 0, veg: 0, gluten: 0, nessuno: 0 };
    regular.forEach((g) => {
      menus[normalizeMenu(g.menu_choice)]++;
    });

    // Group distribution
    const groupMap = new Map<string, number>();
    regular.forEach((g) => {
      const name = g.group_name || "Senza gruppo";
      groupMap.set(name, (groupMap.get(name) || 0) + 1);
    });
    const byGroup = Array.from(groupMap.entries())
      .map(([name, count], i) => ({ name, count, color: groupColor(name, i) }))
      .sort((a, b) => b.count - a.count);

    return { total, adults, children, withPhone, confirmed, declined, pending, plusOnes, menus, byGroup };
  }, [guests]);

  const phonePct = metrics.total > 0 ? Math.round((metrics.withPhone / metrics.total) * 100) : 0;

  const content = (
    <div className="bg-paper-surface border border-paper-border rounded-xl shadow-sm p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-5 gap-4">
        <div>
          <div className="text-[10px] tracking-[0.18em] uppercase text-paper-ink-3 font-medium mb-1">
            Dettaglio
          </div>
          <div className="font-fraunces text-xl sm:text-2xl font-medium text-paper-ink tracking-tight">
            Analisi
          </div>
        </div>
        <div className="text-xs text-paper-ink-3 tabular-nums text-right shrink-0">
          {metrics.total} invitati · {parties.length} nuclei
        </div>
      </div>

      {/* Big stats — 4 columns serif */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <BigStat label="Adulti" value={metrics.adults} />
        <BigStat label="Bambini" value={metrics.children} />
        <BigStat label="Con tel." value={metrics.withPhone} sub={`${phonePct}%`} />
        <BigStat label="+1" value={metrics.plusOnes} sub="abilitati" />
      </div>

      {/* Mini charts — RSVP + Menù */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <MiniChart
          title="RSVP"
          items={[
            { label: "Confermati", value: metrics.confirmed, color: "hsl(142 71% 38%)" },
            { label: "In attesa", value: metrics.pending, color: "hsl(43 80% 45%)" },
            { label: "Rifiutati", value: metrics.declined, color: "hsl(0 72% 51%)" },
          ]}
        />
        <MiniChart
          title="Menù"
          items={[
            { label: "Adulto", value: metrics.menus.adulto, color: "hsl(258 90% 66%)" },
            { label: "Bambino", value: metrics.menus.bambino, color: "hsl(330 75% 55%)" },
            { label: "Vegetariano", value: metrics.menus.veg, color: "hsl(142 71% 38%)" },
            { label: "Senza glutine", value: metrics.menus.gluten, color: "hsl(25 95% 53%)" },
            { label: "Non scelto", value: metrics.menus.nessuno, color: "hsl(var(--paper-border-strong, 30 18% 80%))" },
          ]}
        />
      </div>

      {/* Group distribution */}
      {metrics.byGroup.length > 0 && (
        <div className="mt-6">
          <div className="text-[11px] tracking-[0.1em] uppercase text-paper-ink-3 mb-2.5">
            Distribuzione per gruppo
          </div>
          <div className="flex gap-1 h-2.5 rounded-md overflow-hidden bg-paper-surface-muted">
            {metrics.byGroup.map((g) => (
              <div
                key={g.name}
                title={`${g.name}: ${g.count}`}
                style={{ flex: g.count, background: g.color, minWidth: 2 }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
            {metrics.byGroup.map((g) => (
              <div key={g.name} className="inline-flex items-center gap-1.5 text-xs text-paper-ink-2">
                <span className="w-2 h-2 rounded-sm" style={{ background: g.color }} />
                {g.name}{" "}
                <span className="text-paper-ink-3 tabular-nums">· {g.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-10 border-paper-border-strong text-paper-ink hover:bg-paper-surface-muted gap-2"
          onClick={() => setOpen(true)}
        >
          <BarChart3 className="w-4 h-4" />
          Vedi analisi
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto bg-paper-bg p-4">
            <SheetHeader>
              <SheetTitle className="font-fraunces text-paper-ink text-xl">Analisi</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{content}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 sm:px-5 py-3 rounded-xl border border-paper-border bg-paper-surface shadow-sm hover:bg-paper-surface-muted transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-paper-ink-3" />
            <span className="text-sm font-medium text-paper-ink">{triggerLabel}</span>
            <span className="text-[11px] tracking-wider uppercase text-paper-ink-3">
              {open ? "nascondi" : "mostra"}
            </span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-paper-ink-3 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">{content}</CollapsibleContent>
    </Collapsible>
  );
}

/* ---------- internals ---------- */

function BigStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div>
      <div className="font-fraunces text-3xl sm:text-4xl font-medium text-paper-ink tracking-tight leading-none tabular-nums">
        {value}
      </div>
      <div className="text-xs text-paper-ink-2 mt-1.5">
        {label}
        {sub && <span className="text-paper-ink-3 ml-1.5">{sub}</span>}
      </div>
    </div>
  );
}

function MiniChart({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number; color: string }[];
}) {
  const max = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div>
      <div className="text-[11px] tracking-[0.1em] uppercase text-paper-ink-3 mb-2.5">{title}</div>
      <div className="grid gap-1.5">
        {items.map((it) => {
          const pct = Math.round((it.value / max) * 100);
          return (
            <div key={it.label} className="flex items-center gap-2.5 text-xs">
              <span className="w-24 sm:w-28 text-paper-ink-2 truncate">{it.label}</span>
              <div className="flex-1 h-1.5 bg-paper-surface-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${pct}%`, background: it.color }}
                />
              </div>
              <span className="w-7 text-right text-paper-ink tabular-nums">{it.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
