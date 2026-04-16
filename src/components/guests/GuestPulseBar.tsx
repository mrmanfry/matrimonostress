import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Smartphone, Send, Bell, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestPulseBarProps {
  totalRegular: number;          // total non-couple guests
  confirmed: number;             // confirmed (regular)
  pending: number;               // pending
  declined: number;              // declined
  noPhoneCount: number;          // guests without phone (regular)
  partiesReadyToSend: number;    // nuclei pronti (con telefono e non inviati)
  onSyncPhones: () => void;
  onSendInvites: () => void;
  onAddGuest: () => void;
}

/**
 * Pulse Bar — Sostituisce la tab "Analytics > Panoramica"
 * 
 * Principio: "Calm by default, loud by exception".
 * - Una sola CTA contestuale dinamica (priorità a chi ha bisogno di azione).
 * - Progress bar stratificata sottile (6px) come unico tocco di colore.
 * - Numeri grandi, label piccola, link discreto a /insights.
 */
export const GuestPulseBar = ({
  totalRegular,
  confirmed,
  pending,
  declined,
  noPhoneCount,
  partiesReadyToSend,
  onSyncPhones,
  onSendInvites,
  onAddGuest,
}: GuestPulseBarProps) => {
  const navigate = useNavigate();

  // Percentuali per la progress bar stratificata
  const total = Math.max(totalRegular, 1);
  const confirmedPct = (confirmed / total) * 100;
  const declinedPct = (declined / total) * 100;
  const pendingPct = Math.max(0, 100 - confirmedPct - declinedPct);

  // CTA contestuale — priorità in ordine
  const cta = (() => {
    if (noPhoneCount > 0) {
      return {
        label: "Sincronizza tel.",
        icon: Smartphone,
        onClick: onSyncPhones,
        hint: `${noPhoneCount} senza telefono`,
      };
    }
    if (partiesReadyToSend > 0) {
      return {
        label: "Invia inviti",
        icon: Send,
        onClick: onSendInvites,
        hint: `${partiesReadyToSend} nuclei pronti`,
      };
    }
    if (pending > 10) {
      return {
        label: "Invia reminder",
        icon: Bell,
        onClick: () => navigate("/app/invitations"),
        hint: `${pending} in attesa`,
      };
    }
    return {
      label: "Aggiungi invitato",
      icon: UserPlus,
      onClick: onAddGuest,
      hint: null as string | null,
    };
  })();

  const CtaIcon = cta.icon;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Stats group */}
        <div className="flex items-center gap-5 text-sm">
          <div>
            <div className="text-lg font-semibold tabular-nums text-foreground">
              {confirmed}
              <span className="text-muted-foreground font-normal">/{totalRegular}</span>
            </div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              confermati
            </div>
          </div>
          <div className="h-8 w-px bg-border" aria-hidden />
          <div>
            <div className="text-lg font-semibold tabular-nums text-foreground">{pending}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              in attesa
            </div>
          </div>
          {noPhoneCount > 0 && (
            <>
              <div className="h-8 w-px bg-border" aria-hidden />
              <div>
                <div className="text-lg font-semibold tabular-nums text-foreground">
                  {noPhoneCount}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  senza tel.
                </div>
              </div>
            </>
          )}
        </div>

        {/* CTA + Insights link */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={cta.onClick}
            className="gap-2"
          >
            <CtaIcon className="w-4 h-4" />
            {cta.label}
          </Button>
          <button
            type="button"
            onClick={() => navigate("/app/insights")}
            className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Insights
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Progress bar stratificata (6px) */}
      {totalRegular > 0 && (
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted flex"
          role="progressbar"
          aria-label="Stato RSVP"
          aria-valuenow={confirmed}
          aria-valuemin={0}
          aria-valuemax={totalRegular}
        >
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${confirmedPct}%` }}
          />
          <div
            className={cn("h-full bg-muted-foreground/30 transition-all")}
            style={{ width: `${pendingPct}%` }}
          />
          <div
            className="h-full bg-destructive/60 transition-all"
            style={{ width: `${declinedPct}%` }}
          />
        </div>
      )}
    </div>
  );
};
