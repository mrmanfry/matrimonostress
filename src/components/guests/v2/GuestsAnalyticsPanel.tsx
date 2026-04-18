import { useState } from "react";
import { BarChart3, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * AnalyticsPanel — paper-styled collapsible (desktop) / sheet (mobile)
 * wrapping the existing GuestAnalyticsDashboard. Pure visual chrome.
 */

interface Props {
  isMobile: boolean;
  children: React.ReactNode;
  triggerLabel?: string;
}

export function GuestsAnalyticsPanel({ isMobile, children, triggerLabel = "Analisi dettagliata" }: Props) {
  const [open, setOpen] = useState(false);

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
          Vedi statistiche
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto bg-paper-bg">
            <SheetHeader>
              <SheetTitle className="font-fraunces text-paper-ink text-xl">
                Statistiche Invitati
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">{children}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-paper-border bg-paper-surface shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-paper-surface-muted transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4 text-paper-ink-3" />
              <span className="text-sm font-medium text-paper-ink">{triggerLabel}</span>
              <span className="text-[11px] tracking-wider uppercase text-paper-ink-3">
                {open ? "nascondi" : "mostra"}
              </span>
            </div>
            <ChevronRight
              className={cn(
                "w-4 h-4 text-paper-ink-3 transition-transform",
                open && "rotate-90",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-paper-border p-4 sm:p-5 bg-paper-bg/30">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
