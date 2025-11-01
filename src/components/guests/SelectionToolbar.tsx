import { Button } from "@/components/ui/button";
import { X, Users } from "lucide-react";

interface SelectionToolbarProps {
  selectedCount: number;
  onCreateParty: () => void;
  onClearSelection: () => void;
}

export const SelectionToolbar = ({
  selectedCount,
  onCreateParty,
  onClearSelection,
}: SelectionToolbarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg flex items-center gap-4 animate-in slide-in-from-top">
      <span className="font-medium">
        {selectedCount} invitat{selectedCount === 1 ? 'o' : 'i'} selezionat{selectedCount === 1 ? 'o' : 'i'}
      </span>
      <Button
        onClick={onCreateParty}
        variant="secondary"
        size="sm"
        className="gap-2"
      >
        <Users className="w-4 h-4" />
        Crea Nucleo
      </Button>
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
