import { Button } from "@/components/ui/button";
import { X, Users, Trash2, UserMinus, Send } from "lucide-react";

interface SelectionToolbarProps {
  selectedGuestCount: number;
  selectedPartyCount: number;
  onCreateParty: () => void;
  onDeleteGuests: () => void;
  onDissolveParties: () => void;
  onClearSelection: () => void;
  onSendRSVP?: () => void;
  hasContactsToSend?: boolean;
}

export const SelectionToolbar = ({
  selectedGuestCount,
  selectedPartyCount,
  onCreateParty,
  onDeleteGuests,
  onDissolveParties,
  onClearSelection,
  onSendRSVP,
  hasContactsToSend = false,
}: SelectionToolbarProps) => {
  const totalSelected = selectedGuestCount + selectedPartyCount;
  
  if (totalSelected === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom">
      <span className="font-medium text-sm">
        {totalSelected} selezionat{totalSelected === 1 ? 'o' : 'i'}
      </span>
      
      <div className="h-4 w-px bg-primary-foreground/30" />
      
      {/* Crea Nucleo - solo se ci sono guest singoli selezionati */}
      {selectedGuestCount > 0 && (
        <Button
          onClick={onCreateParty}
          variant="secondary"
          size="sm"
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          Unisci in Nucleo
        </Button>
      )}
      
      {/* Sciogli Nuclei - solo se ci sono party selezionati */}
      {selectedPartyCount > 0 && (
        <Button
          onClick={onDissolveParties}
          variant="secondary"
          size="sm"
          className="gap-2"
        >
          <UserMinus className="w-4 h-4" />
          Sciogli ({selectedPartyCount})
        </Button>
      )}
      
      {/* Invia RSVP - solo se ci sono contatti da inviare */}
      {hasContactsToSend && onSendRSVP && (
        <Button
          onClick={onSendRSVP}
          variant="secondary"
          size="sm"
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Invia RSVP
        </Button>
      )}
      
      {/* Elimina - sempre visibile se c'è selezione */}
      <Button
        onClick={onDeleteGuests}
        variant="secondary"
        size="sm"
        className="gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive"
      >
        <Trash2 className="w-4 h-4" />
        Elimina
      </Button>
      
      {/* Clear selection */}
      <Button
        onClick={onClearSelection}
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};
