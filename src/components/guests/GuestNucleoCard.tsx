import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Edit, Baby, Edit2, UserPlus2, Tag, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { GuestEditDialog } from "./GuestEditDialog";
import { GuestCampaignBadges } from "./GuestCampaignBadges";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  // Wedding CRM fields
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  std_response?: string | null;
  std_responded_at?: string | null;
  rsvp_status?: string | null;
  rsvp_invitation_sent?: string | null;
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
}

/**
 * Detects if family members have different STD responses (discrepancy).
 * Returns details about the discrepancy if found.
 */
function detectStdDiscrepancy(guests: Guest[]): { hasDiscrepancy: boolean; details: string } {
  const responses = guests
    .filter(g => g.std_response)
    .map(g => ({ name: g.first_name, response: g.std_response }));
  
  if (responses.length <= 1) {
    return { hasDiscrepancy: false, details: "" };
  }

  const uniqueResponses = new Set(responses.map(r => r.response));
  if (uniqueResponses.size <= 1) {
    return { hasDiscrepancy: false, details: "" };
  }

  // Build details string showing who said what
  const responseLabels: Record<string, string> = {
    'likely_yes': 'Probabile Sì',
    'likely_no': 'Probabile No',
    'unsure': 'Incerto',
  };

  const details = responses
    .map(r => `${r.name}: ${responseLabels[r.response || ''] || r.response}`)
    .join(', ');

  return { hasDiscrepancy: true, details };
}

/**
 * Gets the status strip color based on party/STD status.
 */
function getStatusStripColor(party: InviteParty): string {
  if (party.rsvp_status === 'Confermato') return 'bg-green-500';
  if (party.rsvp_status === 'Rifiutato') return 'bg-red-500';
  
  // Check STD response from primary guest
  const primaryStd = party.guests[0]?.std_response;
  if (primaryStd === 'likely_yes') return 'bg-violet-500';
  if (primaryStd === 'likely_no') return 'bg-orange-500';
  if (primaryStd === 'unsure') return 'bg-amber-400';
  
  return 'bg-gray-300 dark:bg-gray-600';
}

export const GuestNucleoCard = ({
  party,
  selected,
  onToggleSelect,
  onEdit,
  onGuestUpdate,
}: GuestNucleoCardProps) => {
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [guestEditDialogOpen, setGuestEditDialogOpen] = useState(false);
  const [togglingPlusOne, setTogglingPlusOne] = useState<string | null>(null);

  const handleEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
    setGuestEditDialogOpen(true);
  };

  const handleGuestUpdateSuccess = () => {
    onGuestUpdate?.();
  };

  const handleTogglePlusOne = async (guestId: string, checked: boolean) => {
    setTogglingPlusOne(guestId);
    try {
      const { error } = await supabase
        .from("guests")
        .update({ allow_plus_one: checked })
        .eq("id", guestId);

      if (error) throw error;
      
      toast.success(checked ? "+1 abilitato" : "+1 disabilitato");
      onGuestUpdate?.();
    } catch (error: any) {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setTogglingPlusOne(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confermato':
        return <Badge className="bg-green-600 hover:bg-green-700">✓ Confermato</Badge>;
      case 'Rifiutato':
        return <Badge variant="destructive">✗ Rifiutato</Badge>;
      default:
        return <Badge variant="secondary">⏳ In attesa</Badge>;
    }
  };

  const getSendStatusIcon = (status: string) => {
    switch (status) {
      case 'Inviato':
        return <span className="text-green-600 text-xs">✔</span>;
      case 'Fallito':
        return <span className="text-red-600 text-xs">✗</span>;
      default:
        return null;
    }
  };

  const adults = party.guests.filter(g => !g.is_child);
  const children = party.guests.filter(g => g.is_child);
  const guestsWithPlusOne = party.guests.filter(g => g.allow_plus_one).length;
  // Get group name from the first guest that has one assigned
  const groupName = party.guests.find(g => g.group_name)?.group_name;
  
  // Detect STD discrepancy within family nucleus
  const stdDiscrepancy = useMemo(() => detectStdDiscrepancy(party.guests), [party.guests]);
  
  // Find who responded to STD (first person with std_responded_at)
  const stdResponder = useMemo(() => {
    const respondedGuests = party.guests
      .filter(g => g.std_responded_at)
      .sort((a, b) => new Date(a.std_responded_at!).getTime() - new Date(b.std_responded_at!).getTime());
    return respondedGuests[0]?.first_name || null;
  }, [party.guests]);
  
  // Status strip color
  const statusStripColor = getStatusStripColor(party);

  return (
    <Card className={`relative overflow-hidden hover:shadow-md transition-all ${selected ? 'ring-2 ring-primary' : ''}`}>
      {/* Status Strip - colored bar on the left */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusStripColor}`} />
      
      <div className="p-4 pl-5">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(party.id)}
            className="mt-1"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Users className="w-4 h-4 text-primary flex-shrink-0" />
                  <h3 className="font-semibold truncate">{party.party_name}</h3>
                  {groupName && (
                    <Badge variant="outline" className="text-xs gap-1 bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300">
                      <Tag className="w-3 h-3" />
                      {groupName}
                    </Badge>
                  )}
                  {guestsWithPlusOne > 0 && (
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      <UserPlus2 className="w-3 h-3 mr-1" />
                      {guestsWithPlusOne} +1
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {/* Campaign badge based on primary contact */}
                  {party.guests[0] && (
                    <GuestCampaignBadges 
                      saveTheDateSentAt={party.guests[0].save_the_date_sent_at}
                      formalInviteSentAt={party.guests[0].formal_invite_sent_at}
                      stdResponse={party.guests[0].std_response as 'likely_yes' | 'likely_no' | 'unsure' | null | undefined}
                      rsvpStatus={party.guests[0].rsvp_status}
                      stdRespondedBy={stdResponder}
                      compact
                    />
                  )}
                  {/* STD Discrepancy Warning */}
                  {stdDiscrepancy.hasDiscrepancy && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className="text-xs gap-1 bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-900/20 dark:border-orange-600 dark:text-orange-400 cursor-help"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Risposte diverse
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="text-xs font-medium mb-1">Discrepanza Save The Date:</p>
                          <p className="text-xs text-muted-foreground">{stdDiscrepancy.details}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {adults.length} Adult{adults.length !== 1 ? 'i' : 'o'}, {children.length} Bambin{children.length !== 1 ? 'i' : 'o'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => onEdit(party)}
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span className="text-xs">Modifica Nucleo</span>
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t my-3" />

            {/* Members List */}
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">👥 Membri:</h4>
              <div className="space-y-2 pl-3">
                {adults.map(guest => (
                  <div key={guest.id} className="flex items-center justify-between text-sm group">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="truncate">{guest.first_name} {guest.last_name}</span>
                      {guest.alias && (
                        <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border">
                          aka "{guest.alias}"
                        </span>
                      )}
                      {guest.allow_plus_one && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1 bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300">
                          +1
                        </Badge>
                      )}
                      {guest.phone && (
                        <span className="text-muted-foreground text-xs truncate">
                          ({guest.phone})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs text-muted-foreground">+1</span>
                        <Switch
                          checked={guest.allow_plus_one || false}
                          onCheckedChange={(checked) => handleTogglePlusOne(guest.id, checked)}
                          disabled={togglingPlusOne === guest.id}
                          className="scale-[0.6]"
                          title="Permetti +1"
                        />
                      </div>
                      {getSendStatusIcon(guest.rsvp_send_status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleEditGuest(guest)}
                        title="Modifica invitato"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {children.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2 pt-1 border-t">
                      <Baby className="w-3 h-3" />
                      Bambini:
                    </div>
                    {children.map(guest => (
                      <div key={guest.id} className="flex items-center justify-between text-sm pl-2 group">
                        <span className="text-muted-foreground truncate">
                          {guest.first_name} {guest.last_name}
                        </span>
                        <div className="flex items-center gap-1">
                          {getSendStatusIcon(guest.rsvp_send_status)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleEditGuest(guest)}
                            title="Modifica invitato"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Edit Dialog */}
      <GuestEditDialog
        open={guestEditDialogOpen}
        onOpenChange={setGuestEditDialogOpen}
        guest={editingGuest}
        onSuccess={handleGuestUpdateSuccess}
      />
    </Card>
  );
};
