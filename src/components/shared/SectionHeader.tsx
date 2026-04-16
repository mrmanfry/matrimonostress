import { ReactNode } from "react";
import { ChevronRight, AlertTriangle, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * SectionHeader v1
 * Anatomia condivisa per le sezioni operative (Guests, Budget, Campagne).
 *  1. Titolo + CTA primario
 *  2. Metadata line (prosa grigia con i numeri chiave)
 *  3. Progress visualization polimorfica: stratified | budget | funnel
 *  4. Next action card opzionale, colorata per urgenza (low | medium | high)
 */

export type Urgency = "low" | "medium" | "high";

export type DataViz =
  | {
      type: "stratified";
      segments: Array<{ label: string; count: number; colorClass: string }>;
      total: number;
    }
  | {
      type: "budget";
      paid: number;
      committed: number;
      total: number;
      formatCurrency: (n: number) => string;
    }
  | {
      type: "funnel";
      stages: Array<{ label: string; count: number }>;
    };

export interface NextAction {
  title: string;
  description: string;
  urgency: Urgency;
  cta: { label: string; onClick: () => void };
}

interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  count?: number;
  metadata?: ReactNode;
  primaryCta?: { label: string; icon?: ReactNode; onClick: () => void };
  secondaryActions?: ReactNode;
  dataViz?: DataViz;
  nextAction?: NextAction;
  className?: string;
}

const urgencyStyles: Record<
  Urgency,
  { card: string; icon: typeof Sparkles; iconClass: string; button: string }
> = {
  low: {
    card: "border-primary/20 bg-primary/5",
    icon: Sparkles,
    iconClass: "text-primary",
    button: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  medium: {
    card: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
    icon: Clock,
    iconClass: "text-amber-600 dark:text-amber-400",
    button:
      "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600",
  },
  high: {
    card: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
    icon: AlertTriangle,
    iconClass: "text-red-600 dark:text-red-400",
    button: "bg-red-600 text-white hover:bg-red-700",
  },
};

export function SectionHeader({
  icon,
  title,
  count,
  metadata,
  primaryCta,
  secondaryActions,
  dataViz,
  nextAction,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Row 1 — Titolo + CTA */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
            {icon}
            <span className="truncate">{title}</span>
            {typeof count === "number" && count > 0 && (
              <span className="text-muted-foreground font-normal text-base md:text-xl">
                ({count})
              </span>
            )}
          </h1>
          {metadata && (
            <p className="text-muted-foreground text-sm mt-1">{metadata}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {secondaryActions}
          {primaryCta && (
            <Button onClick={primaryCta.onClick}>
              {primaryCta.icon}
              {primaryCta.label}
            </Button>
          )}
        </div>
      </div>

      {/* Row 2 — Progress visualization */}
      {dataViz && <ProgressViz dataViz={dataViz} />}

      {/* Row 3 — Next action */}
      {nextAction && <NextActionCard action={nextAction} />}
    </div>
  );
}

function ProgressViz({ dataViz }: { dataViz: DataViz }) {
  if (dataViz.type === "stratified") {
    const { segments, total } = dataViz;
    if (total === 0) return null;
    return (
      <div className="space-y-1.5">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
          {segments.map((s, i) => {
            const pct = (s.count / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={i}
                className={cn("h-full transition-all", s.colorClass)}
                style={{ width: `${pct}%` }}
                title={`${s.label}: ${s.count}`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {segments.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", s.colorClass)} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-semibold text-foreground">{s.count}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (dataViz.type === "budget") {
    const { paid, committed, total, formatCurrency } = dataViz;
    const denom = Math.max(total, committed, 1);
    const paidPct = Math.min((paid / denom) * 100, 100);
    // Committed but not paid
    const remainingCommitted = Math.max(committed - paid, 0);
    const committedPct = Math.min((remainingCommitted / denom) * 100, 100 - paidPct);
    const overBudget = committed > total && total > 0;

    return (
      <div className="space-y-1.5">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted relative">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${paidPct}%` }}
            title={`Pagato: ${formatCurrency(paid)}`}
          />
          <div
            className="h-full bg-primary/70 transition-all"
            style={{ width: `${committedPct}%` }}
            title={`Impegnato: ${formatCurrency(remainingCommitted)}`}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Pagato</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(paid)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary/70" />
              <span className="text-muted-foreground">Impegnato</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(committed)}
              </span>
            </span>
          </div>
          <span
            className={cn(
              "text-xs",
              overBudget
                ? "text-red-600 dark:text-red-400 font-semibold"
                : "text-muted-foreground"
            )}
          >
            {overBudget ? "Oltre budget · " : ""}
            Budget {formatCurrency(total)}
          </span>
        </div>
      </div>
    );
  }

  // funnel
  const { stages } = dataViz;
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className="space-y-1">
      {stages.map((s, i) => {
        const pct = (s.count / max) * 100;
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-28 md:w-32 text-muted-foreground truncate flex-shrink-0">
              {s.label}
            </span>
            <div className="flex-1 h-5 rounded bg-muted relative overflow-hidden min-w-[40px]">
              <div
                className={cn(
                  "h-full transition-all",
                  i === stages.length - 1
                    ? "bg-emerald-500/80"
                    : "bg-primary/70"
                )}
                style={{ width: `${pct}%` }}
              />
              <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-foreground">
                {s.count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NextActionCard({ action }: { action: NextAction }) {
  const styles = urgencyStyles[action.urgency];
  const Icon = styles.icon;
  return (
    <Card className={cn("p-3 md:p-4 border", styles.card)}>
      <div className="flex items-start gap-3 flex-wrap md:flex-nowrap">
        <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", styles.iconClass)} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground">
            {action.title}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {action.description}
          </p>
        </div>
        <button
          type="button"
          onClick={action.cta.onClick}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors flex-shrink-0",
            styles.button
          )}
        >
          {action.cta.label}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  );
}
