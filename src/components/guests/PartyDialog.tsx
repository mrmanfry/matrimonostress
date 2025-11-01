import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Search } from "lucide-react";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  is_child: boolean;
  phone?: string;
}

interface InviteParty {
  id?: string;
  party_name: string;
  guest_ids: string[];
}

interface PartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  party?: InviteParty;
  availableGuests: Guest[];
  onSave: (party: InviteParty) => Promise<void>;
}

export const PartyDialog = ({
  open,
  onOpenChange,
  party,
  availableGuests,
  onSave,
}: PartyDialogProps) => {
  const [partyName, setPartyName] = useState("");
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && party) {
      setPartyName(party.party_name);
      setSelectedGuestIds(party.guest_ids);
    } else if (open) {
      setPartyName("");
      setSelectedGuestIds([]);
    }
    setSearchQuery("");
  }, [open, party]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim() || selectedGuestIds.length === 0) return;

    setLoading(true);
    try {
      await onSave({
        id: party?.id,
        party_name: partyName,
        guest_ids: selectedGuestIds,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleGuest = (guestId: string) => {
    setSelectedGuestIds(prev =>
      prev.includes(guestId)
        ? prev.filter(id => id !== guestId)
        : [...prev, guestId]
    );
  };

  const filteredGuests = availableGuests.filter(guest => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      guest.first_name.toLowerCase().includes(query) ||
      guest.last_name.toLowerCase().includes(query)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {party ? 'Modifica Nucleo di Invito' : 'Crea Nucleo di Invito'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Party Name */}
          <div className="space-y-2">
            <Label htmlFor="party-name">Nome del Nucleo *</Label>
            <Input
              id="party-name"
              placeholder="es. Famiglia Rossi, Marco & Giulia..."
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              required
            />
          </div>

          {/* Guest Selection */}
          <div className="space-y-3">
            <Label>Seleziona Membri ({selectedGuestIds.length} selezionati) *</Label>
            
            {/* Search Field */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="🔍 Cerca invitati..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[300px] border rounded-md p-4">
              <div className="space-y-2">
                {availableGuests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nessun invitato disponibile. Tutti gli invitati sono già assegnati a un nucleo.
                  </p>
                ) : filteredGuests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nessun invitato trovato con "{searchQuery}"
                  </p>
                ) : (
                  filteredGuests.map(guest => (
                    <div
                      key={guest.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted rounded transition-colors"
                    >
                      <Checkbox
                        id={guest.id}
                        checked={selectedGuestIds.includes(guest.id)}
                        onCheckedChange={() => toggleGuest(guest.id)}
                      />
                      <label
                        htmlFor={guest.id}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span>
                            {guest.first_name} {guest.last_name}
                            {guest.is_child && (
                              <span className="text-xs text-muted-foreground ml-2">(bambino)</span>
                            )}
                          </span>
                          {guest.phone && (
                            <span className="text-xs text-muted-foreground">{guest.phone}</span>
                          )}
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading || !partyName.trim() || selectedGuestIds.length === 0}
            >
              {loading ? 'Salvataggio...' : party ? 'Salva Modifiche' : 'Crea Nucleo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
