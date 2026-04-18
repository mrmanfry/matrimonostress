import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Edit, Baby, Edit2, Plus, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { GuestEditDialog } from "./GuestEditDialog";
import { GuestStatusDot, deriveGuestStatus, deriveNucleusStatus } from "./GuestStatusDot";
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
  group_id?: string | null;
  group_name?: string | null;
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  std_response?: string | null;
  std_responded_at?: string | null;
  rsvp_status?: string | null;
  rsvp_invitation_sent?: string | null;
  plus_one_of_guest_id?: string | null;
}

interface InviteParty {
  id: string;
  party_name: string;
  rsvp_status: 'In attesa' | 'Confermato' | 'Rifiutato';
  guests: Guest[];
}

interface GuestNucleoCardProps {
  party: InviteParty;
  selected: boolean;
  onToggleSelect: (partyId: string) => void;
  onEdit: (party: InviteParty) => void;
  onGuestUpdate?: () => void;
  maskSensitiveData?: boolean;
  readOnly?: boolean;
}

function detectStdDiscrepancy(guests: Guest[]): { hasDiscrepancy: boolean; details: string } {
  const responses = guests
    .filter((g) => g.std_response)
    .map((g) => ({ name: g.first_name, response: g.std_response }));
  if (responses.length <= 1) return { hasDiscrepancy: false, details: "" };
  const unique = new Set(responses.map((r) => r.response));
  if (unique.size <= 1) return { hasDiscrepancy: false, details: "" };
  const labels: Record<string, string> = {
    likely_yes: "Probabile Sì",
    likely_no: "Probabile No",
    unsure: "Incerto",
  };
  return {
    hasDiscrepancy: true,
    details: responses.map((r) => `${r.name}: ${labels[r.response || ""] || r.response}`).join(", "),
  };
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

/** Build the nucleus-level prose status line. */
function buildNucleusStatusLine(party: InviteParty, nucleus: { saveTheDateSentAt: string | null; formalInviteSentAt: string | null }): string | null {
  if (party.rsvp_status === "Confermato") return "Nucleo confermato";
  if (party.rsvp_status === "Rifiutato") return "Nucleo rifiutato";
  if (nucleus.formalInviteSentAt) {
    return `Invito inviato · ${formatShortDate(nucleus.formalInviteSentAt)}`;
  }
  if (nucleus.saveTheDateSentAt) {
    return `Save the date · ${formatShortDate(nucleus.saveTheDateSentAt)}`;
  }
  // Partial STD?
  const phoneGuests = party.guests.filter((g) => g.phone);
  const stdSent = party.guests.filter((g) => g.save_the_date_sent_at).length;
  if (stdSent > 0 && phoneGuests.length > 0 && stdSent < phoneGuests.length) {
    return `Save the date inviato a ${stdSent} su ${phoneGuests.length}`;
  }
  return null;
}

export const GuestNucleoCard = ({
  party,
  selected,
  onToggleSelect,
  onEdit,
  onGuestUpdate,
  maskSensitiveData = false,
  readOnly = false,
}: GuestNucleoCardProps) => {
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [guestEditDialogOpen, setGuestEditDialogOpen] = useState(false);

  const handleEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
    setGuestEditDialogOpen(true);
  };

  const adults = party.guests.filter((g) => !g.is_child);
  const children = party.guests.filter((g) => g.is_child);
  const guestsWithPlusOne = party.guests.filter((g) => g.allow_plus_one).length;
  const groupName = party.guests.find((g) => g.group_name)?.group_name;

  // Map host guest_id → first_name to render "+1 di X" badge for promoted +1 guests
  const hostNameById = new Map<string, string>();
  party.guests.forEach((g) => hostNameById.set(g.id, g.first_name));

  const stdDiscrepancy = useMemo(() => detectStdDiscrepancy(party.guests), [party.guests]);

  const nucleusCampaignStatus = useMemo(() => {
    const guestsWithPhone = party.guests.filter((g) => g.phone);
    const guestsWithStdSent = party.guests.filter((g) => g.save_the_date_sent_at);
    const guestsWithFormalInvite = party.guests.filter((g) => g.formal_invite_sent_at);

    if (guestsWithPhone.length === 0) {
      return {
        saveTheDateSentAt: guestsWithStdSent[0]?.save_the_date_sent_at ?? null,
        formalInviteSentAt: guestsWithFormalInvite[0]?.formal_invite_sent_at ?? null,
      };
    }

    const allStd = guestsWithPhone.every((g) => g.save_the_date_sent_at);
    const allFormal = guestsWithPhone.every((g) => g.formal_invite_sent_at);
    const stdDates = guestsWithPhone
      .filter((g) => g.save_the_date_sent_at)
      .map((g) => g.save_the_date_sent_at!)
      .sort();
    const formalDates = guestsWithPhone
      .filter((g) => g.formal_invite_sent_at)
      .map((g) => g.formal_invite_sent_at!)
      .sort();

    return {
      saveTheDateSentAt: allStd && stdDates.length > 0 ? stdDates[stdDates.length - 1] : null,
      formalInviteSentAt: allFormal && formalDates.length > 0 ? formalDates[formalDates.length - 1] : null,
    };
  }, [party.guests]);

  const nucleusStatus = deriveNucleusStatus(party.guests);
  const statusLine = buildNucleusStatusLine(party, nucleusCampaignStatus);

  return (
    <Card
      className={`relative overflow-hidden transition-shadow hover:shadow-sm border-paper-border bg-paper-surface ${
        selected ? "ring-2 ring-paper-brand border-paper-brand" : ""
      }`}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          {!readOnly && (
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect(party.id)}
              className="mt-1"
            />
          )}

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <GuestStatusDot status={nucleusStatus} size="sm" tooltip={statusLine ?? "Nessuna risposta"} />
                  <Users className="w-3.5 h-3.5 text-paper-ink-3 flex-shrink-0" />
                  <h3 className="font-fraunces font-medium text-base sm:text-[17px] tracking-tight text-paper-ink truncate">{party.party_name}</h3>

                  {guestsWithPlusOne > 0 && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center text-xs text-muted-foreground gap-0.5 flex-shrink-0">
                            <Plus className="w-3 h-3" />
                            {guestsWithPlusOne}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{guestsWithPlusOne} accompagnatori (+1)</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {stdDiscrepancy.hasDiscrepancy && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500/80 flex-shrink-0 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="text-xs font-medium mb-1">Risposte diverse nel nucleo</p>
                          <p className="text-xs text-muted-foreground">{stdDiscrepancy.details}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                <div className="flex items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground flex-wrap">
                  {statusLine && <span>{statusLine}</span>}
                  {groupName && (
                    <>
                      {statusLine && <span aria-hidden>·</span>}
                      <GroupDot groupName={groupName} />
                    </>
                  )}
                  <span aria-hidden>·</span>
                  <span>
                    {adults.length} Adult{adults.length !== 1 ? "i" : "o"}
                    {children.length > 0 && `, ${children.length} Bambin${children.length !== 1 ? "i" : "o"}`}
                  </span>
                </div>
              </div>

              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => onEdit(party)}
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span className="text-xs hidden sm:inline">Modifica</span>
                </Button>
              )}
            </div>

            {/* Members list */}
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
              {adults.map((guest) => {
                const memberStatus = deriveGuestStatus({
                  rsvpStatus: guest.rsvp_status,
                  stdResponse: guest.std_response,
                });
                const lastName = maskSensitiveData ? `${guest.last_name.charAt(0)}.` : guest.last_name;
                const showAlias = guest.alias && !maskSensitiveData;
                const memberName = showAlias
                  ? `${guest.first_name} "${guest.alias}" ${lastName}`
                  : `${guest.first_name} ${lastName}`;

                return (
                  <div key={guest.id} className="flex items-center justify-between gap-2 group min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <GuestStatusDot status={memberStatus} size="xs" />
                      <span className="text-xs sm:text-sm truncate">{memberName}</span>
                      {guest.plus_one_of_guest_id && hostNameById.get(guest.plus_one_of_guest_id) && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                          +1 di {hostNameById.get(guest.plus_one_of_guest_id)}
                        </span>
                      )}
                      {guest.allow_plus_one && !guest.plus_one_of_guest_id && (
                        <Plus className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      )}
                      {guest.phone && !maskSensitiveData && (
                        <span className="hidden sm:inline text-xs text-muted-foreground/70 truncate">
                          · {guest.phone}
                        </span>
                      )}
                    </div>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleEditGuest(guest)}
                        title="Modifica invitato"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                );
              })}

              {children.length > 0 && (
                <>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2 pt-1.5 border-t border-border/30">
                    <Baby className="w-3 h-3" />
                    Bambini
                  </div>
                  {children.map((guest) => (
                    <div key={guest.id} className="flex items-center justify-between gap-2 pl-1 group min-w-0">
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {maskSensitiveData
                          ? `${guest.first_name} ${guest.last_name.charAt(0)}.`
                          : `${guest.first_name} ${guest.last_name}`}
                      </span>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEditGuest(guest)}
                          title="Modifica invitato"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <GuestEditDialog
        open={guestEditDialogOpen}
        onOpenChange={setGuestEditDialogOpen}
        guest={editingGuest}
        onSuccess={() => onGuestUpdate?.()}
      />
    </Card>
  );
};
