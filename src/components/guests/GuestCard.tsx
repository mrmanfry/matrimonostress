import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  adults_count: number;
  children_count: number;
  menu_choice: string;
  dietary_restrictions: string;
  notes: string;
  group_name?: string;
}

interface GuestCardProps {
  guest: Guest;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const GuestCard = ({ 
  guest, 
  isSelected,
  onToggleSelect,
  onEdit, 
  onDelete 
}: GuestCardProps) => {
  const getRSVPBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-chart-2">Confermato</Badge>;
      case "declined":
        return <Badge className="bg-chart-1">Rifiutato</Badge>;
      default:
        return <Badge className="bg-chart-3">In attesa</Badge>;
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">
              {guest.first_name} {guest.last_name}
            </h3>
            {guest.group_name && (
              <Badge variant="outline" className="mt-1">
                {guest.group_name}
              </Badge>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {getRSVPBadge(guest.rsvp_status)}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          👥 {guest.adults_count} {guest.adults_count === 1 ? 'adulto' : 'adulti'}
          {guest.children_count > 0 && `, ${guest.children_count} ${guest.children_count === 1 ? 'bambino' : 'bambini'}`}
        </p>
        {guest.dietary_restrictions && (
          <p>🍽️ {guest.dietary_restrictions}</p>
        )}
        {guest.menu_choice && (
          <p>🍴 Menù: {guest.menu_choice}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="flex-1"
        >
          <Edit className="w-4 h-4 mr-2" />
          Modifica
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
