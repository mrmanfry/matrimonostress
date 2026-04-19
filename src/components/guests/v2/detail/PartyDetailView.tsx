import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bell, Edit, UtensilsCrossed, Trash2, X, ChevronRight } from "lucide-react";
import { GuestStatusDot, deriveGuestStatus, deriveNucleusStatus } from "@/components/guests/GuestStatusDot";
import { cn } from "@/lib/utils";
import { PercorsoStepper, PercorsoStep } from "./PercorsoStepper";
import { DetailDivider } from "./DetailDivider";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  alias?: string;
  phone?: string | null;
  is_child: boolean;
  is_couple_member?: boolean;
  allow_plus_one?: boolean;
  menu_choice?: string | null;
  dietary_restrictions?: string | null;
  rsvp_status?: string | null;
  std_response?: string | null;
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
}

interface InviteParty {
  id: string;
  party_name: string;
  rsvp_status: "In attesa" | "Confermato" | "Rifiutato";
  guests: Guest[];
}

interface Props {
  party: InviteParty;
  hasTableAssigned?: boolean;
  onClose: () => void;
  onOpenGuest: (guestId: string) => void;
  onSendInvite: () => void;
  onRemind: () => void;
  onEditNucleus: () => void;
  onMenu: () => void;
  onDelete: () => void;
}

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "warn";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warn"
      ? "text-amber-600"
      : "text-paper-ink";
  return (
    <div className="rounded-lg border border-paper-border bg-paper-surface p-3">
      <div className="text-[10px] tracking-[0.14em] uppercase text-paper-ink-3 mb-1">
        {label}
      </div>
      <div className={cn("font-fraunces text-[22px] font-medium tracking-tight tabular-nums", toneClass)}>
        {value}
      </div>
    </div>
  );
}

function MemberRow({ guest, onOpen }: { guest: Guest; onOpen: (id: string) => void }) {
  const status = deriveGuestStatus({
    rsvpStatus: guest.rsvp_status,
    stdResponse: guest.std_response,
  });
  const initials = `${guest.first_name?.[0] ?? ""}${guest.last_name?.[0] ?? ""}`.toUpperCase();

  return (
    <button
      onClick={() => onOpen(guest.id)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-paper-border bg-paper-surface hover:bg-paper-surface-muted transition-colors text-left"
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0 border",
          guest.is_couple_member
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : guest.is_child
            ? "bg-paper-surface-muted text-paper-ink-3 border-paper-border"
            : "bg-paper-brand/10 text-paper-brand border-paper-brand/30"
        )}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-fraunces text-[14px] font-medium text-paper-ink truncate">
            {guest.first_name} {guest.last_name}
          </span>
          {guest.is_child && <span className="text-[11px] text-paper-ink-3 flex-shrink-0">· bambino</span>}
          {guest.is_couple_member && <span className="text-[11px] text-amber-700 flex-shrink-0">· sposi</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-paper-ink-3">
          <span className="inline-flex items-center gap-1">
            <GuestStatusDot status={status} size="xs" />
            {status === "confirmed" ? "Confermato" : status === "declined" ? "Rifiutato" : status === "maybe" ? "Forse" : "In attesa"}
          </span>
          {guest.menu_choice && <span>· menù {guest.menu_choice}</span>}
          {guest.dietary_restrictions && (
            <span className="text-amber-600">· {guest.dietary_restrictions}</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-3 h-3 text-paper-ink-3 flex-shrink-0" />
    </button>
  );
}

export function PartyDetailView({
  party,
  hasTableAssigned = false,
  onClose,
  onOpenGuest,
  onSendInvite,
  onRemind,
  onEditNucleus,
  onMenu,
  onDelete,
}: Props) {
  const total = party.guests.length;
  const confirmed = party.guests.filter((g) => g.rsvp_status === "confirmed" || g.is_couple_member).length;
  const withPhone = party.guests.filter((g) => g.phone).length;
  const childrenCount = party.guests.filter((g) => g.is_child).length;

  const stdSent = party.guests.length > 0 && party.guests.every((g) => g.save_the_date_sent_at);
  const invSent = party.guests.length > 0 && party.guests.every((g) => g.formal_invite_sent_at);
  const allConfirmed = party.rsvp_status === "Confermato";
  const declined = party.rsvp_status === "Rifiutato";

  const steps: PercorsoStep[] = [
    { label: "Bozza creata", done: true },
    { label: "Save the date inviato", done: stdSent, current: !stdSent },
    { label: "Invito formale inviato", done: invSent, current: stdSent && !invSent },
    {
      label: declined ? "Rifiutato" : "RSVP confermato",
      done: allConfirmed || declined,
      current: invSent && !allConfirmed && !declined,
    },
    { label: "Tavolo assegnato", done: hasTableAssigned, current: allConfirmed && !hasTableAssigned },
  ];

  const nucleusStatus = deriveNucleusStatus(party.guests);
  const statusLabel =
    party.rsvp_status === "Confermato"
      ? "Confermato"
      : party.rsvp_status === "Rifiutato"
      ? "Rifiutato"
      : "In attesa";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="px-6 pt-5 pb-4 border-b border-paper-border relative"
        style={{ background: "linear-gradient(180deg, #FDFBF6 0%, hsl(var(--paper-surface)) 100%)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] tracking-[0.18em] uppercase text-paper-ink-3 mb-1.5">
              Nucleo · {total} {total === 1 ? "membro" : "membri"}
            </div>
            <h2 className="font-fraunces text-[26px] font-medium text-paper-ink tracking-tight leading-tight m-0">
              {party.party_name}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="gap-1.5 font-normal">
              <GuestStatusDot status={nucleusStatus} size="xs" />
              {statusLabel}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} title="Chiudi">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-5 pb-10">
          <DetailDivider label="Membri del nucleo" />
          <div className="grid gap-2">
            {party.guests.map((g) => (
              <MemberRow key={g.id} guest={g} onOpen={onOpenGuest} />
            ))}
          </div>

          <DetailDivider label="Percorso" />
          <PercorsoStepper steps={steps} />

          <DetailDivider label="Stato" />
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Confermati" value={`${confirmed}/${total}`} tone="success" />
            <StatTile
              label="Con telefono"
              value={`${withPhone}/${total}`}
              tone={withPhone === total ? "neutral" : "warn"}
            />
            <StatTile label="Bambini" value={childrenCount} />
          </div>

          <DetailDivider label="Azioni" />
          <div className="flex flex-wrap gap-2 items-center">
            <Button size="sm" onClick={onSendInvite}>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Invia invito
            </Button>
            <Button variant="outline" size="sm" onClick={onRemind}>
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Sollecita RSVP
            </Button>
            <Button variant="outline" size="sm" onClick={onEditNucleus}>
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              Modifica nucleo
            </Button>
            <Button variant="ghost" size="sm" onClick={onMenu}>
              <UtensilsCrossed className="w-3.5 h-3.5 mr-1.5" />
              Menù nucleo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Elimina
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
