import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff } from "lucide-react";

type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  description: string | null;
  location: string | null;
  order_index: number;
  is_public: boolean;
};

type EventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: TimelineEvent | null;
  onSave: (event: Omit<TimelineEvent, "id" | "order_index">) => void;
};

export const EventDialog = ({ open, onOpenChange, event, onSave }: EventDialogProps) => {
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (event) {
      setTime(event.time.slice(0, 5));
      setTitle(event.title);
      setDescription(event.description || "");
      setLocation(event.location || "");
      setIsPublic(event.is_public ?? true);
    } else {
      setTime("");
      setTitle("");
      setDescription("");
      setLocation("");
      setIsPublic(true);
    }
  }, [event, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      time,
      title,
      description: description || null,
      location: location || null,
      is_public: isPublic,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Modifica Evento" : "Nuovo Evento"}</DialogTitle>
          <DialogDescription>
            Aggiungi un momento importante del tuo grande giorno
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="time">Orario *</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titolo *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Cerimonia, Aperitivo, Cena..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dettagli aggiuntivi..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Luogo</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="es. Chiesa di San Marco, Villa dei Fiori..."
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-3">
            <div className="space-y-1">
              <Label htmlFor="is_public" className="flex items-center gap-2 cursor-pointer">
                {isPublic ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                Visibile nei link pubblici
              </Label>
              <p className="text-xs text-muted-foreground">
                Se attivo, l'evento appare nei link condivisi con ospiti e fornitori. Disattivalo per momenti riservati (preparativi, cene private, briefing interni).
              </p>
            </div>
            <Switch id="is_public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit">Salva</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
