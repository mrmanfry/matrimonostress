import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Users, Phone, Edit, Send, Baby, Edit2, UserPlus2 } from "lucide-react";
import { useState } from "react";
import { GuestEditDialog } from "./GuestEditDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_child: boolean;
  rsvp_send_status: 'Non Inviato' | 'Inviato' | 'Fallito';
  allow_plus_one?: boolean;
  plus_one_name?: string;
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
  onSendRSVP: (party: InviteParty) => void;
  onGuestUpdate?: () => void;
}

export const GuestNucleoCard = ({
  party,
  selected,
  onToggleSelect,
  onEdit,
  onSendRSVP,
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
  const guestsWithPhone = party.guests.filter(g => g.phone).length;
  const totalGuests = party.guests.length;
  const allSent = party.guests.every(g => g.rsvp_send_status === 'Inviato');
  const guestsWithPlusOne = party.guests.filter(g => g.allow_plus_one).length;

  return (
    <Card className={`p-4 hover:shadow-md transition-all ${selected ? 'ring-2 ring-primary' : ''}`}>
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
                <h3 className="font-semibold truncate">Nucleo: {party.party_name}</h3>
                {guestsWithPlusOne > 0 && (
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    <UserPlus2 className="w-3 h-3 mr-1" />
                    {guestsWithPlusOne} +1
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {getStatusBadge(party.rsvp_status)}
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  Totale: {adults.length} Adult{adults.length !== 1 ? 'i' : 'o'}, {children.length} Bambin{children.length !== 1 ? 'i' : 'o'}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <span className={guestsWithPhone === totalGuests ? 'text-green-600' : 'text-orange-600'}>
                  ({guestsWithPhone}/{totalGuests} contatti presenti)
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
                    {guest.allow_plus_one && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300">
                        +1
                      </Badge>
                    )}
                    {guest.phone ? (
                      <span className="text-muted-foreground text-xs truncate">
                        ({guest.phone})
                      </span>
                    ) : (
                      <span className="text-orange-600 text-xs">(nessun numero)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
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

          {/* Send RSVP Button */}
          {guestsWithPhone > 0 && (
            <div className="mt-3 pt-3 border-t">
              <Button
                onClick={() => onSendRSVP(party)}
                size="sm"
                variant={allSent ? "outline" : "default"}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {allSent ? 'Invia di nuovo RSVP' : '💬 Invia RSVP'}
              </Button>
            </div>
          )}
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
