import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Phone, Edit, UserPlus, Baby, UserPlus2, Heart, Tag } from "lucide-react";
import { useState } from "react";
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
  unique_rsvp_token?: string;
  group_id?: string | null;
  group_name?: string | null;
  // Wedding CRM fields
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  std_response?: string | null;
  rsvp_status?: string | null;
  rsvp_invitation_sent?: string | null;
}

interface GuestSingleCardProps {
  guest: Guest;
  selected: boolean;
  onToggleSelect: (guestId: string) => void;
  onEdit: (guestId: string) => void;
  onAddToParty: (guestId: string) => void;
  onGuestUpdate?: () => void;
}

export const GuestSingleCard = ({
  guest,
  selected,
  onToggleSelect,
  onEdit,
  onAddToParty,
  onGuestUpdate,
}: GuestSingleCardProps) => {
  const [guestEditDialogOpen, setGuestEditDialogOpen] = useState(false);
  const [togglingPlusOne, setTogglingPlusOne] = useState(false);
  
  const displayName = `${guest.first_name} ${guest.last_name}`;

  const handleEditClick = () => {
    setGuestEditDialogOpen(true);
  };

  const handleGuestUpdateSuccess = () => {
    onGuestUpdate?.();
  };

  const handleTogglePlusOne = async (checked: boolean) => {
    setTogglingPlusOne(true);
    try {
      const { error } = await supabase
        .from("guests")
        .update({ allow_plus_one: checked })
        .eq("id", guest.id);

      if (error) throw error;
      
      toast.success(checked ? "+1 abilitato" : "+1 disabilitato");
      onGuestUpdate?.();
    } catch (error: any) {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setTogglingPlusOne(false);
    }
  };

  return (
    <Card className={`p-3 md:p-4 hover:shadow-md transition-all ${selected ? 'ring-2 ring-primary' : ''} ${guest.is_couple_member ? 'border-pink-200 dark:border-pink-900/50 bg-pink-50/30 dark:bg-pink-950/10' : ''}`}>
      <div className="flex items-start gap-2 md:gap-3">
        {/* Checkbox - hidden for couple members */}
        {!guest.is_couple_member && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(guest.id)}
            className="mt-1"
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                {guest.is_couple_member && (
                  <Heart className="w-4 h-4 text-pink-500 fill-pink-500 flex-shrink-0" />
                )}
                <h3 className="font-semibold truncate text-sm md:text-base">{displayName}</h3>
                {/* Alias Badge */}
                {guest.alias && (
                  <span className="text-xs font-normal text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border">
                    aka "{guest.alias}"
                  </span>
                )}
                {guest.is_couple_member && (
                  <Badge className="text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-0">
                    Sposo/a
                  </Badge>
                )}
                {guest.is_child && (
                  <Badge variant="outline" className="text-xs">
                    <Baby className="w-3 h-3 mr-1" />
                    Bambino
                  </Badge>
                )}
                {guest.allow_plus_one && !guest.is_couple_member && (
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    <UserPlus2 className="w-3 h-3 mr-1" />
                    +1
                  </Badge>
                )}
                {guest.group_name && !guest.is_couple_member && (
                  <Badge variant="outline" className="text-xs gap-1 bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300">
                    <Tag className="w-3 h-3" />
                    {guest.group_name}
                  </Badge>
                )}
              </div>
              {/* Campaign Badges - Couple members always show as confirmed */}
              {!guest.is_couple_member && (
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                  <GuestCampaignBadges 
                    saveTheDateSentAt={guest.save_the_date_sent_at}
                    formalInviteSentAt={guest.formal_invite_sent_at}
                    stdResponse={guest.std_response as 'likely_yes' | 'likely_no' | 'unsure' | null | undefined}
                    rsvpStatus={guest.rsvp_status}
                    compact
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleEditClick}
                title={guest.is_couple_member ? "Modifica preferenze alimentari" : "Modifica dettagli invitato"}
              >
                <Edit className="w-4 h-4" />
              </Button>
              {!guest.is_couple_member && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onAddToParty(guest.id)}
                  title="Aggiungi a nucleo"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Contact Info - Hidden for couple members */}
          {!guest.is_couple_member && (
            <div className="flex items-center gap-2 text-sm">
              {guest.phone ? (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span>{guest.phone}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-orange-600">
                  <Phone className="w-3 h-3" />
                  <span className="text-xs">(Numero mancante)</span>
                </div>
              )}
            </div>
          )}

          {/* Plus One Toggle & Person count */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              {guest.is_couple_member ? (
                <span className="text-pink-600 dark:text-pink-400">Confermato</span>
              ) : (
                guest.is_child ? '0 Adulti, 1 Bambino' : '1 Adulto, 0 Bambini'
              )}
            </div>
            {!guest.is_child && !guest.is_couple_member && (
              <div 
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs text-muted-foreground">Permetti +1</span>
                <Switch
                  checked={guest.allow_plus_one || false}
                  onCheckedChange={handleTogglePlusOne}
                  disabled={togglingPlusOne}
                  className="scale-75"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guest Edit Dialog */}
      <GuestEditDialog
        open={guestEditDialogOpen}
        onOpenChange={setGuestEditDialogOpen}
        guest={guest}
        onSuccess={handleGuestUpdateSuccess}
      />
    </Card>
  );
};
