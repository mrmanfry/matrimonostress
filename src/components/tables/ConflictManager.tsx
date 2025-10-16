import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Guest = {
  id: string;
  first_name: string;
  last_name: string;
};

type Conflict = {
  id: string;
  guest_id_1: string;
  guest_id_2: string;
};

type ConflictManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: Guest[];
  conflicts: Conflict[];
  weddingId: string | null;
  onUpdate: () => void;
};

export const ConflictManager = ({
  open,
  onOpenChange,
  guests,
  conflicts,
  weddingId,
  onUpdate,
}: ConflictManagerProps) => {
  const [guest1, setGuest1] = useState<string>("");
  const [guest2, setGuest2] = useState<string>("");
  const { toast } = useToast();

  const addConflict = async () => {
    if (!guest1 || !guest2 || !weddingId) return;

    if (guest1 === guest2) {
      toast({ title: "Errore", description: "Seleziona due invitati diversi", variant: "destructive" });
      return;
    }

    const exists = conflicts.some(
      c => (c.guest_id_1 === guest1 && c.guest_id_2 === guest2) ||
           (c.guest_id_1 === guest2 && c.guest_id_2 === guest1)
    );

    if (exists) {
      toast({ title: "Conflitto già esistente", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("guest_conflicts").insert({
      wedding_id: weddingId,
      guest_id_1: guest1,
      guest_id_2: guest2,
    });

    if (error) {
      toast({ title: "Errore", description: "Impossibile aggiungere il conflitto", variant: "destructive" });
    } else {
      toast({ title: "Conflitto aggiunto" });
      setGuest1("");
      setGuest2("");
      onUpdate();
    }
  };

  const removeConflict = async (conflictId: string) => {
    const { error } = await supabase
      .from("guest_conflicts")
      .delete()
      .eq("id", conflictId);

    if (error) {
      toast({ title: "Errore", description: "Impossibile rimuovere il conflitto", variant: "destructive" });
    } else {
      toast({ title: "Conflitto rimosso" });
      onUpdate();
    }
  };

  const getGuestName = (guestId: string) => {
    const guest = guests.find(g => g.id === guestId);
    return guest ? `${guest.first_name} ${guest.last_name}` : "?";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestione Conflitti</DialogTitle>
          <DialogDescription>
            Specifica quali invitati non devono essere seduti allo stesso tavolo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={guest1} onValueChange={setGuest1}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleziona primo invitato" />
              </SelectTrigger>
              <SelectContent>
                {guests.map(guest => (
                  <SelectItem key={guest.id} value={guest.id}>
                    {guest.first_name} {guest.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AlertTriangle className="w-5 h-5 text-muted-foreground self-center" />

            <Select value={guest2} onValueChange={setGuest2}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleziona secondo invitato" />
              </SelectTrigger>
              <SelectContent>
                {guests.map(guest => (
                  <SelectItem key={guest.id} value={guest.id}>
                    {guest.first_name} {guest.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={addConflict}>Aggiungi</Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {conflicts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nessun conflitto configurato
              </p>
            ) : (
              conflicts.map(conflict => (
                <Card key={conflict.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">
                        {getGuestName(conflict.guest_id_1)} ⚠️ {getGuestName(conflict.guest_id_2)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeConflict(conflict.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
