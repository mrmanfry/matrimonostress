import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface RoomFormData {
  room_name: string;
  room_type: string;
  capacity: number;
  price_per_night: number;
  nights: number;
  notes: string;
}

interface RoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: RoomFormData) => void;
  initialData?: RoomFormData | null;
  loading?: boolean;
}

const ROOM_TYPES = [
  { value: "singola", label: "Singola" },
  { value: "doppia", label: "Doppia" },
  { value: "tripla", label: "Tripla" },
  { value: "suite", label: "Suite" },
  { value: "family", label: "Family" },
];

const defaultData: RoomFormData = {
  room_name: "",
  room_type: "doppia",
  capacity: 2,
  price_per_night: 0,
  nights: 1,
  notes: "",
};

export const RoomDialog = ({ open, onOpenChange, onSave, initialData, loading }: RoomDialogProps) => {
  const [form, setForm] = useState<RoomFormData>(defaultData);
  const isEdit = !!initialData;

  useEffect(() => {
    if (open) {
      setForm(initialData ?? defaultData);
    }
  }, [open, initialData]);

  const handleSave = () => {
    if (!form.room_name.trim()) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica Camera" : "Nuova Camera"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome camera *</Label>
            <Input
              value={form.room_name}
              onChange={(e) => setForm({ ...form, room_name: e.target.value })}
              placeholder="es. Camera 101"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={form.room_type} onValueChange={(v) => setForm({ ...form, room_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Capacità</Label>
              <Input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prezzo/notte (€)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.price_per_night}
                onChange={(e) => setForm({ ...form, price_per_night: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Notti</Label>
              <Input
                type="number"
                min={1}
                value={form.nights}
                onChange={(e) => setForm({ ...form, nights: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <div>
            <Label>Note</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Note opzionali..."
              rows={2}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Totale camera: <span className="font-semibold text-foreground">€ {(form.price_per_night * form.nights).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={loading || !form.room_name.trim()}>
            {isEdit ? "Salva" : "Aggiungi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
