import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bell, Edit, Trash2, X } from "lucide-react";
import { GuestStatusDot, deriveGuestStatus } from "@/components/guests/GuestStatusDot";
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
  plus_one_name?: string | null;
  menu_choice?: string | null;
  dietary_restrictions?: string | null;
  rsvp_status?: string | null;
  std_response?: string | null;
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  group_id?: string | null;
  group_name?: string | null;
}

interface Props {
  guest: Guest;
  partyName?: string | null;
  onClose: () => void;
  onSendInvite: () => void;
  onRemind: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 items-center py-2.5 border-b border-paper-border/60 last:border-b-0">
      <div className="text-[11px] tracking-[0.06em] uppercase text-paper-ink-3">{label}</div>
      <div className="text-[13px] text-paper-ink min-w-0">
        {isEmpty ? <span className="italic text-paper-ink-3">—</span> : value}
      </div>
    </div>
  );
}

const statusLabel = (s?: string | null) => {
  if (s === "confirmed") return "Confermato";
  if (s === "declined") return "Rifiutato";
  return "In attesa";
};

export function GuestDetailView({
  guest,
  partyName,
  onClose,
  onSendInvite,
  onRemind,
  onEdit,
  onDelete,
}: Props) {
  const status = deriveGuestStatus({
    rsvpStatus: guest.rsvp_status,
    stdResponse: guest.std_response,
  });
  const initials = `${guest.first_name?.[0] ?? ""}${guest.last_name?.[0] ?? ""}`.toUpperCase();

  const stdSent = !!guest.save_the_date_sent_at;
  const invSent = !!guest.formal_invite_sent_at;
  const confirmed = guest.rsvp_status === "confirmed" || guest.is_couple_member;
  const declined = guest.rsvp_status === "declined";

  const steps: PercorsoStep[] = [
    { label: "Bozza creata", done: true },
    { label: "Save the date inviato", done: stdSent, current: !stdSent },
    { label: "Invito formale inviato", done: invSent, current: stdSent && !invSent },
    {
      label: declined ? "Rifiutato" : "RSVP confermato",
      done: !!confirmed || declined,
      current: invSent && !confirmed && !declined,
    },
    { label: "Tavolo assegnato", done: false, current: !!confirmed },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="px-6 pt-5 pb-4 border-b border-paper-border relative"
        style={{ background: "linear-gradient(180deg, #FDFBF6 0%, hsl(var(--paper-surface)) 100%)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-medium flex-shrink-0 border",
                guest.is_couple_member
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : guest.is_child
                  ? "bg-paper-surface-muted text-paper-ink-3 border-paper-border"
                  : "bg-paper-brand/10 text-paper-brand border-paper-brand/30"
              )}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] tracking-[0.18em] uppercase text-paper-ink-3 mb-1.5">
                {partyName ? `${partyName} · Invitato` : "Invitato singolo"}
              </div>
              <h2 className="font-fraunces text-[24px] font-medium text-paper-ink tracking-tight leading-tight m-0 truncate">
                {guest.first_name} {guest.last_name}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="gap-1.5 font-normal">
              <GuestStatusDot status={status} size="xs" />
              {statusLabel(guest.rsvp_status)}
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
          <DetailDivider label="Contatto" />
          <div>
            <MetaRow label="Telefono" value={guest.phone} />
            <MetaRow label="Alias" value={guest.alias} />
            <MetaRow
              label="Gruppo"
              value={guest.group_name ? <span className="text-paper-ink">{guest.group_name}</span> : null}
            />
          </div>

          <DetailDivider label="Evento" />
          <div>
            <MetaRow
              label="RSVP"
              value={
                <Badge variant="outline" className="gap-1.5 font-normal">
                  <GuestStatusDot status={status} size="xs" />
                  {statusLabel(guest.rsvp_status)}
                </Badge>
              }
            />
            <MetaRow label="Save the date" value={stdSent ? "Inviato" : "Non inviato"} />
            <MetaRow label="Invito" value={invSent ? "Inviato" : "Non inviato"} />
            <MetaRow
              label="Menù"
              value={guest.menu_choice ? <span className="capitalize">{guest.menu_choice}</span> : null}
            />
            <MetaRow label="Diete" value={guest.dietary_restrictions} />
            <MetaRow
              label="+1"
              value={guest.allow_plus_one ? guest.plus_one_name || "Abilitato" : null}
            />
          </div>

          <DetailDivider label="Percorso" />
          <PercorsoStepper steps={steps} />

          <DetailDivider label="Azioni" />
          <div className="flex flex-wrap gap-2 items-center">
            {!guest.is_couple_member && (
              <>
                <Button size="sm" onClick={onSendInvite}>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Invia invito
                </Button>
                <Button variant="outline" size="sm" onClick={onRemind}>
                  <Bell className="w-3.5 h-3.5 mr-1.5" />
                  Sollecita
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              Modifica
            </Button>
            {!guest.is_couple_member && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Elimina
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
