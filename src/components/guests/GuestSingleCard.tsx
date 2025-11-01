import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Edit, UserPlus, Baby } from "lucide-react";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_child: boolean;
  rsvp_send_status: 'Non Inviato' | 'Inviato' | 'Fallito';
}

interface GuestSingleCardProps {
  guest: Guest;
  selected: boolean;
  onToggleSelect: (guestId: string) => void;
  onEdit: (guestId: string) => void;
  onAddToParty: (guestId: string) => void;
}

export const GuestSingleCard = ({
  guest,
  selected,
  onToggleSelect,
  onEdit,
  onAddToParty,
}: GuestSingleCardProps) => {
  const displayName = `${guest.first_name} ${guest.last_name}`;

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
                onClick={() => onEdit(guest.id)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onAddToParty(guest.id)}
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

          {/* Person count */}
          <div className="text-xs text-muted-foreground mt-2">
            ({guest.is_child ? '0 Adulti, 1 Bambino' : '1 Adulto, 0 Bambini'})
          </div>
        </div>
      </div>
    </Card>
  );
};
