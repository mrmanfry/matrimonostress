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

type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  description: string | null;
  location: string | null;
  order_index: number;
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

  useEffect(() => {
    if (event) {
      setTime(event.time.slice(0, 5));
      setTitle(event.title);
      setDescription(event.description || "");
      setLocation(event.location || "");
    } else {
      setTime("");
      setTitle("");
      setDescription("");
      setLocation("");
    }
  }, [event, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      time,
      title,
      description: description || null,
      location: location || null,
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
