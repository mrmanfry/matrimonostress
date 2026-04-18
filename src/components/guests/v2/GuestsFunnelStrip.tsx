import { FileEdit, Mail, Send, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getEffectiveStatus } from "@/lib/nucleusStatusHelper";

/**
 * FunnelStrip — paper editorial strip with the 5 guest stages.
 * Mirrors the designer's "spine" pattern (gold rule, serif numerals, tabular nums).
 * Logic (counts) re-uses the nucleus-aware helper used by FunnelKPICards.
 */

interface Guest {
  id: string;
  party_id?: string | null;
  phone?: string | null;
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  std_response?: string | null;
  rsvp_status?: string | null;
  is_couple_member?: boolean;
}

interface Props {
  guests: Guest[];
  activeStage: string | null;
  onToggleStage: (stage: string | null) => void;
}

const STAGES = [
  { id: "draft", label: "Bozze", sub: "da preparare", Icon: FileEdit, tone: "neutral" as const },
  { id: "std_sent", label: "Save the date", sub: "inviato", Icon: Mail, tone: "info" as const },
  { id: "invited", label: "Invitati", sub: "in attesa", Icon: Send, tone: "warn" as const },
  { id: "confirmed", label: "Confermati", sub: "presenti", Icon: CheckCircle2, tone: "success" as const },
  { id: "declined", label: "Rifiutati", sub: "non verranno", Icon: XCircle, tone: "danger" as const },
];

const TONE_CLASSES: Record<string, { fg: string; ring: string; bar: string }> = {
  neutral: { fg: "text-paper-ink-2", ring: "border-paper-border-strong", bar: "bg-paper-border-strong" },
  info: { fg: "text-blue-700", ring: "border-blue-200", bar: "bg-blue-500" },
  warn: { fg: "text-amber-700", ring: "border-amber-200", bar: "bg-amber-500" },
  success: { fg: "text-emerald-700", ring: "border-emerald-200", bar: "bg-emerald-500" },
  danger: { fg: "text-rose-700", ring: "border-rose-200", bar: "bg-rose-500" },
};

function computeCounts(guests: Guest[]) {
  const regular = guests.filter((g) => !g.is_couple_member);
  const couple = guests.filter((g) => g.is_couple_member);
  const counts = { draft: 0, std_sent: 0, invited: 0, confirmed: 0, declined: 0 };

  regular.forEach((g) => {
    const status = getEffectiveStatus(g, guests);
    if (g.rsvp_status === "declined") counts.declined++;
    else if (g.rsvp_status === "confirmed") counts.confirmed++;
    else if (status.hasFormalInvite) counts.invited++;
    else if (status.hasStdSent) counts.std_sent++;
    else counts.draft++;
  });
  // Couple members are always confirmed
  counts.confirmed += couple.length;
  return counts;
}

export function GuestsFunnelStrip({ guests, activeStage, onToggleStage }: Props) {
  const counts = computeCounts(guests);
  const total = guests.filter((g) => !g.is_couple_member).length + guests.filter((g) => g.is_couple_member).length;
  const totalRegular = guests.filter((g) => !g.is_couple_member).length;

  return (
    <div className="rounded-xl overflow-hidden border border-paper-border bg-paper-surface shadow-sm">
      {/* Editorial header */}
      <div className="flex items-baseline justify-between gap-4 px-5 py-4 border-b border-paper-border bg-gradient-to-b from-paper-surface to-paper-bg/40">
        <div>
          <div className="text-[10px] tracking-[0.18em] uppercase text-paper-ink-3 mb-1 font-medium">
            Percorso invitati
          </div>
          <div className="font-fraunces text-xl md:text-2xl font-medium text-paper-ink tracking-tight">
            Dal primo annuncio al giorno del sì
          </div>
        </div>
        <div className="text-right">
          <div className="font-fraunces text-2xl md:text-3xl font-medium text-paper-ink leading-none tabular-nums">
            {counts.confirmed}
            <span className="text-paper-ink-3 text-base">/{total}</span>
          </div>
          <div className="text-[11px] text-paper-ink-3 mt-1 tracking-wider uppercase">
            confermati
          </div>
        </div>
      </div>

      {/* Stages — horizontal scroll on mobile, equal grid on desktop */}
      <div className="flex md:grid md:grid-cols-5 overflow-x-auto md:overflow-visible">
        {STAGES.map((s, i) => {
          const isActive = activeStage === s.id;
          const tone = TONE_CLASSES[s.tone];
          const count = counts[s.id as keyof typeof counts];
          return (
            <button
              key={s.id}
              onClick={() => onToggleStage(isActive ? null : s.id)}
              className={cn(
                "relative text-left p-4 transition-colors flex-shrink-0 min-w-[140px] md:min-w-0",
                "border-r border-paper-border last:border-r-0",
                "border-t-2",
                isActive
                  ? "bg-paper-brand-tint border-t-paper-brand"
                  : "border-t-transparent hover:bg-paper-surface-muted",
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-[1.5px] bg-paper-surface inline-flex items-center justify-center",
                    tone.ring,
                    tone.fg,
                  )}
                >
                  <s.Icon className="w-3 h-3" />
                </div>
                <div className="text-[11px] tracking-wider uppercase text-paper-ink-3 font-medium">
                  {String(i + 1).padStart(2, "0")}
                </div>
              </div>
              <div className="font-fraunces text-2xl md:text-[26px] font-medium text-paper-ink leading-none tracking-tight tabular-nums">
                {count}
              </div>
              <div className="text-[13px] text-paper-ink mt-1.5 font-medium">{s.label}</div>
              <div className="text-[11px] text-paper-ink-3 mt-0.5">{s.sub}</div>
              {isActive && (
                <div className="absolute bottom-2 right-3 text-[9px] tracking-wider uppercase text-paper-brand-ink">
                  filtro attivo
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="flex h-1.5 bg-paper-surface-muted">
        {[
          { k: "confirmed" as const, cls: "bg-emerald-500" },
          { k: "invited" as const, cls: "bg-amber-500" },
          { k: "std_sent" as const, cls: "bg-blue-500" },
          { k: "draft" as const, cls: "bg-paper-border-strong" },
          { k: "declined" as const, cls: "bg-rose-500" },
        ].map((s) => {
          const w = totalRegular ? (counts[s.k] / totalRegular) * 100 : 0;
          return (
            <div
              key={s.k}
              className={cn(s.cls, "transition-[width] duration-300")}
              style={{ width: `${w}%`, opacity: counts[s.k] ? 1 : 0 }}
            />
          );
        })}
      </div>
    </div>
  );
}
