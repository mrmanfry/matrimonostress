import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Guest {
  id?: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  adults_count: number;
  children_count: number;
  menu_choice: string;
  dietary_restrictions: string;
  notes: string;
  group_id: string | null;
}

interface GuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: Guest | null;
  groups: Array<{ id: string; name: string }>;
  onSave: (guest: Guest) => Promise<void>;
}

const emptyGuest: Guest = {
  first_name: "",
  last_name: "",
  rsvp_status: "pending",
  adults_count: 1,
  children_count: 0,
  menu_choice: "",
  dietary_restrictions: "",
  notes: "",
  group_id: null,
};

export function GuestDialog({
  open,
  onOpenChange,
  guest,
  groups,
  onSave,
}: GuestDialogProps) {
  const [formData, setFormData] = useState<Guest>(emptyGuest);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (guest) {
      setFormData(guest);
    } else {
      setFormData(emptyGuest);
    }
  }, [guest, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving guest:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {guest ? "Modifica Invitato" : "Nuovo Invitato"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nome *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Cognome *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                required
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rsvp_status">Stato RSVP</Label>
              <Select
                value={formData.rsvp_status}
                onValueChange={(value) =>
                  setFormData({ ...formData, rsvp_status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">In attesa</SelectItem>
                  <SelectItem value="confirmed">Confermato</SelectItem>
                  <SelectItem value="declined">Rifiutato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group_id">Gruppo</Label>
              <Select
                value={formData.group_id || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    group_id: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nessun gruppo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun gruppo</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adults_count">N° Adulti</Label>
              <Input
                id="adults_count"
                type="number"
                min="0"
                max="20"
                value={formData.adults_count}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    adults_count: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="children_count">N° Bambini</Label>
              <Input
                id="children_count"
                type="number"
                min="0"
                max="20"
                value={formData.children_count}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    children_count: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="menu_choice">Scelta Menù</Label>
            <Input
              id="menu_choice"
              value={formData.menu_choice}
              onChange={(e) =>
                setFormData({ ...formData, menu_choice: e.target.value })
              }
              placeholder="Es: Carne, Pesce, Vegetariano"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dietary_restrictions">
              Restrizioni Alimentari / Allergie
            </Label>
            <Textarea
              id="dietary_restrictions"
              value={formData.dietary_restrictions}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dietary_restrictions: e.target.value,
                })
              }
              placeholder="Es: Celiaco, vegano, allergia ai crostacei"
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Informazioni aggiuntive"
              rows={3}
              maxLength={1000}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
