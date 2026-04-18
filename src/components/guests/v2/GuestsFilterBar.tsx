import { Search, Send, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * FilterBar — paper-styled search + active filters strip.
 * Re-uses GuestFilters underneath via children for advanced controls.
 */

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  disabled?: boolean;
  onCampaigns?: () => void;
  campaignsVisible?: boolean;
  activeStageLabel?: string | null;
  onClearStage?: () => void;
  children?: React.ReactNode;
}

export function GuestsFilterBar({
  searchQuery,
  onSearchChange,
  disabled,
  onCampaigns,
  campaignsVisible,
  activeStageLabel,
  onClearStage,
  children,
}: Props) {
  return (
    <div className="rounded-xl border border-paper-border bg-paper-surface shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center p-3 sm:p-4 bg-gradient-to-b from-paper-bg/40 to-paper-surface border-b border-paper-border">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-paper-ink-3" />
          <Input
            placeholder={disabled ? "Ricerca disabilitata" : "Cerca nucleo o persona…"}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabled}
            className={cn(
              "pl-9 h-10 bg-paper-surface border-paper-border text-paper-ink",
              "placeholder:text-paper-ink-3 focus-visible:ring-paper-brand/40 focus-visible:border-paper-brand",
            )}
          />
        </div>

        {campaignsVisible && (
          <Button
            type="button"
            variant="outline"
            onClick={onCampaigns}
            className="h-10 gap-2 border-paper-border-strong text-paper-ink hover:bg-paper-surface-muted whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span className="sm:hidden">Campagne</span>
            <span className="hidden sm:inline">Vai alle Campagne</span>
          </Button>
        )}
      </div>

      {/* Active stage chip */}
      {activeStageLabel && (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-paper-border bg-paper-brand-tint/40">
          <span className="text-[11px] uppercase tracking-wider text-paper-ink-3 font-medium">
            Filtro
          </span>
          <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-paper-surface border border-paper-border text-[12px] text-paper-ink">
            {activeStageLabel}
            <button
              type="button"
              onClick={onClearStage}
              className="text-paper-ink-3 hover:text-paper-ink"
              aria-label="Rimuovi filtro"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {/* Slot for the existing GuestFilters (kept for compatibility) */}
      {children && <div className="p-3 sm:p-4">{children}</div>}
    </div>
  );
}
