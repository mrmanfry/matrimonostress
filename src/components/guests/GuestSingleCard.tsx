import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Phone, Edit, UserPlus, Baby, UserPlus2 } from "lucide-react";
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
    <Card className={`p-4 hover:shadow-md transition-all ${selected ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(guest.id)}
          className="mt-1"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{displayName}</h3>
                {guest.is_child && (
                  <Badge variant="outline" className="text-xs">
                    <Baby className="w-3 h-3 mr-1" />
                    Bambino
                  </Badge>
                )}
                {guest.allow_plus_one && (
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    <UserPlus2 className="w-3 h-3 mr-1" />
                    +1
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                <Badge variant="secondary" className="text-xs">In attesa</Badge>
                <span>•</span>
                <span>Gruppo: <span className="text-orange-600 font-medium">(non assegnato)</span></span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleEditClick}
                title="Modifica dettagli invitato"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onAddToParty(guest.id)}
                title="Aggiungi a nucleo"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Contact Info */}
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

          {/* Plus One Toggle & Person count */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              ({guest.is_child ? '0 Adulti, 1 Bambino' : '1 Adulto, 0 Bambini'})
            </div>
            {!guest.is_child && (
              <div className="flex items-center gap-2">
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
