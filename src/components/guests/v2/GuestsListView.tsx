import { cn } from "@/lib/utils";

/**
 * Paper-styled wrapper for the guest list. Provides a continuous "letter-paper"
 * surface with hairline rules between rows. Children are the existing
 * GuestNucleoCard / GuestSingleCard components (light reskin applied internally).
 */

interface Props {
  isEmpty: boolean;
  emptyMessage?: string;
  totalLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function GuestsListView({
  isEmpty,
  emptyMessage = "Nessun invitato trovato con i filtri applicati.",
  totalLabel,
  children,
  className,
}: Props) {
  return (
    <div className={cn("rounded-xl border border-paper-border bg-paper-surface shadow-sm overflow-hidden", className)}>
      {totalLabel && (
        <div className="px-4 sm:px-5 py-3 border-b border-paper-border bg-gradient-to-b from-paper-bg/40 to-paper-surface flex items-baseline justify-between">
          <div className="text-[10px] tracking-[0.18em] uppercase text-paper-ink-3 font-medium">
            Lista
          </div>
          <div className="text-[12px] text-paper-ink-3 tabular-nums">{totalLabel}</div>
        </div>
      )}
      {isEmpty ? (
        <div className="px-6 py-12 text-center text-paper-ink-3 text-sm">{emptyMessage}</div>
      ) : (
        <div className="p-3 sm:p-4 space-y-2.5">{children}</div>
      )}
    </div>
  );
}
