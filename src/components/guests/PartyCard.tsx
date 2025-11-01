import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Phone, Edit, Trash2, Send, Baby } from "lucide-react";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_child: boolean;
  rsvp_send_status: 'Non Inviato' | 'Inviato' | 'Fallito';
}

interface InviteParty {
  id: string;
  party_name: string;
  rsvp_status: 'In attesa' | 'Confermato' | 'Rifiutato';
  guests: Guest[];
}

interface PartyCardProps {
  party: InviteParty;
  onEdit: (party: InviteParty) => void;
  onDelete: (partyId: string) => void;
  onSendRSVP: (party: InviteParty) => void;
}

export const PartyCard = ({ party, onEdit, onDelete, onSendRSVP }: PartyCardProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confermato':
        return <Badge variant="default" className="bg-green-600">✓ Confermato</Badge>;
      case 'Rifiutato':
        return <Badge variant="destructive">✗ Rifiutato</Badge>;
      default:
        return <Badge variant="secondary">⏳ In attesa</Badge>;
    }
  };

  const getSendStatusIcon = (status: string) => {
    switch (status) {
      case 'Inviato':
        return <span className="text-green-600 text-xs">✔ Inviato</span>;
      case 'Fallito':
        return <span className="text-red-600 text-xs">✗ Fallito</span>;
      default:
        return null;
    }
  };

  const adults = party.guests.filter(g => !g.is_child);
  const children = party.guests.filter(g => g.is_child);
  const hasContacts = party.guests.some(g => g.phone);
  const allSent = party.guests.every(g => g.rsvp_send_status === 'Inviato');

  return (
    <Card className="p-6 hover:shadow-elegant transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">{party.party_name}</h3>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(party.rsvp_status)}
            <span className="text-sm text-muted-foreground">
              {party.guests.length} {party.guests.length === 1 ? 'persona' : 'persone'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(party)}
            className="h-8 w-8 p-0"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(party.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-2 mb-4">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          👥 Membri:
        </h4>
        <div className="space-y-1 pl-4">
          {adults.map(guest => (
            <div key={guest.id} className="flex items-center justify-between text-sm py-1">
              <div className="flex items-center gap-2">
                <span>{guest.first_name} {guest.last_name}</span>
                {guest.phone && (
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {guest.phone}
                  </span>
                )}
              </div>
              {getSendStatusIcon(guest.rsvp_send_status)}
            </div>
          ))}
          {children.length > 0 && (
            <>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                <Baby className="w-3 h-3" />
                Bambini:
              </div>
              {children.map(guest => (
                <div key={guest.id} className="flex items-center justify-between text-sm py-1 pl-4">
                  <span className="text-muted-foreground">{guest.first_name} {guest.last_name}</span>
                  {getSendStatusIcon(guest.rsvp_send_status)}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        {hasContacts ? (
          <Button
            onClick={() => onSendRSVP(party)}
            size="sm"
            variant={allSent ? "outline" : "default"}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            {allSent ? 'Invia di nuovo' : 'Invia RSVP'}
          </Button>
        ) : (
          <Button
            disabled
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <Phone className="w-4 h-4 mr-2" />
            Nessun contatto
          </Button>
        )}
      </div>
    </Card>
  );
};
