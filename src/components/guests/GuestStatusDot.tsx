import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type GuestStatus = "confirmed" | "declined" | "maybe" | "pending";

interface GuestStatusDotProps {
  status: GuestStatus;
  size?: "xs" | "sm" | "md";
  tooltip?: string;
  className?: string;
}

// Desaturated palette — no full-saturation Tailwind defaults
const STATUS_STYLES: Record<GuestStatus, { bg: string; ring: string; label: string }> = {
  confirmed: {
    bg: "bg-emerald-500/80",
    ring: "ring-emerald-500/20",
    label: "Confermato",
  },
  declined: {
    bg: "bg-rose-500/80",
    ring: "ring-rose-500/20",
    label: "Rifiutato",
  },
  maybe: {
    bg: "bg-amber-400/90",
    ring: "ring-amber-400/20",
    label: "Forse",
  },
  pending: {
    bg: "bg-slate-300 dark:bg-slate-600",
    ring: "ring-slate-300/30",
    label: "Nessuna risposta",
  },
};

const SIZE_MAP = {
  xs: "w-1.5 h-1.5",
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
};

export function GuestStatusDot({
  status,
  size = "sm",
  tooltip,
  className,
}: GuestStatusDotProps) {
  const style = STATUS_STYLES[status];
  const tip = tooltip ?? style.label;

  const dot = (
    <span
      className={cn(
        "inline-block rounded-full ring-2 flex-shrink-0",
        SIZE_MAP[size],
        style.bg,
        style.ring,
        className,
      )}
      aria-label={tip}
      role="status"
    />
  );

  if (!tip) return dot;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{dot}</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{tip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Helper: derive a GuestStatus from RSVP / STD response fields.
 * Priority: confirmed/declined RSVP > likely_no/likely_yes/unsure STD > pending.
 */
export function deriveGuestStatus(input: {
  rsvpStatus?: string | null;
  stdResponse?: string | null;
}): GuestStatus {
  if (input.rsvpStatus === "confirmed") return "confirmed";
  if (input.rsvpStatus === "declined") return "declined";
  if (input.stdResponse === "likely_yes") return "confirmed";
  if (input.stdResponse === "likely_no") return "declined";
  if (input.stdResponse === "unsure") return "maybe";
  return "pending";
}

/**
 * Helper: derive a nucleus-level status from its members.
 * - all confirmed → confirmed
 * - all declined → declined
 * - any mixed responses → maybe
 * - no one responded → pending
 */
export function deriveNucleusStatus(
  members: Array<{ rsvp_status?: string | null; std_response?: string | null }>,
): GuestStatus {
  if (members.length === 0) return "pending";
  const statuses = members.map((m) =>
    deriveGuestStatus({ rsvpStatus: m.rsvp_status, stdResponse: m.std_response }),
  );
  const unique = new Set(statuses);
  if (unique.size === 1) return statuses[0];
  // Mixed
  if (unique.has("confirmed") && unique.has("declined")) return "maybe";
  if (unique.has("maybe")) return "maybe";
  // Some confirmed, some pending → maybe (partial)
  if (unique.has("confirmed") || unique.has("declined")) return "maybe";
  return "pending";
}
