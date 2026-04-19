import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Phone, Edit, UserPlus, Baby, Plus, Heart } from "lucide-react";
import { useState } from "react";
import { GuestEditDialog } from "./GuestEditDialog";
import { GuestStatusDot, deriveGuestStatus } from "./GuestStatusDot";
import { GroupDot } from "./GroupDot";

interface Guest {
  id: string;
  wedding_id?: string;
  first_name: string;
  last_name: string;
  alias?: string;
  phone?: string;
  is_child: boolean;
  rsvp_send_status: 'Non Inviato' | 'Inviato' | 'Fallito';
  allow_plus_one?: boolean;
  plus_one_name?: string;
  is_couple_member?: boolean;
  menu_choice?: string;
  dietary_restrictions?: string;
  unique_rsvp_token?: string;
  group_id?: string | null;
  group_name?: string | null;
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  std_response?: string | null;
  rsvp_status?: string | null;
  rsvp_invitation_sent?: string | null;
}

interface GuestSingleCardProps {
  guest: Guest;
  selected: boolean;
  isOpen?: boolean;
  onToggleSelect: (guestId: string) => void;
  onEdit: (guestId: string) => void;
  onAddToParty: (guestId: string) => void;
  onCardClick?: (guestId: string) => void;
  onGuestUpdate?: () => void;
  maskSensitiveData?: boolean;
  readOnly?: boolean;
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

/** Build the short RSVP/invite status line, prose-style. */
function buildStatusLine(guest: Guest): string | null {
  if (guest.rsvp_status === "confirmed") return "Confermato";
  if (guest.rsvp_status === "declined") return "Rifiutato";
  if (guest.formal_invite_sent_at) {
    return `Invito inviato · ${formatShortDate(guest.formal_invite_sent_at)}`;
  }
  if (guest.save_the_date_sent_at) {
    return `Save the date · ${formatShortDate(guest.save_the_date_sent_at)}`;
  }
  return null;
}

export const GuestSingleCard = ({
  guest,
  selected,
  isOpen = false,
  onToggleSelect,
  onEdit: _onEdit,
  onAddToParty,
  onCardClick,
  onGuestUpdate,
  maskSensitiveData = false,
  readOnly = false,
}: GuestSingleCardProps) => {
  const [guestEditDialogOpen, setGuestEditDialogOpen] = useState(false);

  // Name with alias inline (journalistic convention: Alberto "Albe" Rossi)
  const lastName = maskSensitiveData ? `${guest.last_name.charAt(0)}.` : guest.last_name;
  const showAlias = guest.alias && !maskSensitiveData;
  const displayName = showAlias
    ? `${guest.first_name} "${guest.alias}" ${lastName}`
    : `${guest.first_name} ${lastName}`;

  const status = deriveGuestStatus({
    rsvpStatus: guest.rsvp_status,
    stdResponse: guest.std_response,
  });
  const statusLine = buildStatusLine(guest);

  const handleGuestUpdateSuccess = () => onGuestUpdate?.();

  return (
    <Card
      className={`p-3 md:p-4 transition-shadow hover:shadow-sm border-paper-border bg-paper-surface ${
        selected ? "ring-2 ring-paper-brand border-paper-brand" : ""
      } ${isOpen ? "ring-2 ring-paper-brand/60 border-paper-brand/60" : ""} ${guest.is_couple_member ? "bg-paper-surface-muted" : ""} ${onCardClick ? "cursor-pointer" : ""}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, [role="checkbox"]')) return;
        onCardClick?.(guest.id);
      }}
    >
      <div className="flex items-start gap-2 md:gap-3">
        {/* Checkbox */}
        {!guest.is_couple_member && !readOnly && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(guest.id)}
            className="mt-1"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                {/* RSVP status dot — pre-attentive signal */}
                {!guest.is_couple_member && (
                  <GuestStatusDot
                    status={status}
                    size="sm"
                    tooltip={statusLine ?? "Nessuna risposta"}
                  />
                )}
                {guest.is_couple_member && (
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 flex-shrink-0" />
                )}
                <h3 className="font-fraunces font-medium text-base md:text-[17px] tracking-tight text-paper-ink truncate">{displayName}</h3>

                {/* Inline icons (no fills) */}
                {guest.is_child && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Baby className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>Bambino</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {guest.allow_plus_one && !guest.is_couple_member && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>Accompagnatore (+1)</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Metadata line: status + group + phone, all in muted prose */}
              {!guest.is_couple_member && (
                <div className="flex items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground flex-wrap">
                  {statusLine && <span>{statusLine}</span>}
                  {guest.group_name && (
                    <>
                      {statusLine && <span aria-hidden>·</span>}
                      <GroupDot groupName={guest.group_name} />
                    </>
                  )}
                  {guest.phone && !maskSensitiveData && (
                    <>
                      {(statusLine || guest.group_name) && <span aria-hidden>·</span>}
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {guest.phone}
                      </span>
                    </>
                  )}
                  {!guest.phone && !maskSensitiveData && (
                    <>
                      {(statusLine || guest.group_name) && <span aria-hidden>·</span>}
                      <span className="inline-flex items-center gap-1 text-amber-600/80 dark:text-amber-400/80">
                        <Phone className="w-3 h-3" />
                        Numero mancante
                      </span>
                    </>
                  )}
                </div>
              )}
              {guest.is_couple_member && (
                <p className="text-xs text-muted-foreground mt-0.5">Confermato</p>
              )}
            </div>

            {/* Actions */}
            {!readOnly && (
              <div className="flex gap-0.5 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setGuestEditDialogOpen(true)}
                  title={
                    guest.is_couple_member
                      ? "Modifica preferenze alimentari"
                      : "Modifica dettagli invitato"
                  }
                >
                  <Edit className="w-4 h-4" />
                </Button>
                {!guest.is_couple_member && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => onAddToParty(guest.id)}
                    title="Aggiungi a nucleo"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <GuestEditDialog
        open={guestEditDialogOpen}
        onOpenChange={setGuestEditDialogOpen}
        guest={guest}
        onSuccess={handleGuestUpdateSuccess}
      />
    </Card>
  );
};
