import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, UserPlus2 } from "lucide-react";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_child: boolean;
  allow_plus_one?: boolean;
}

interface GuestEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: Guest | null;
  onSuccess: () => void;
}

export const GuestEditDialog = ({
  open,
  onOpenChange,
  guest,
  onSuccess,
}: GuestEditDialogProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isChild, setIsChild] = useState(false);
  const [allowPlusOne, setAllowPlusOne] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && guest) {
      setFirstName(guest.first_name);
      setLastName(guest.last_name);
      setPhone(guest.phone || "");
      setIsChild(guest.is_child);
      setAllowPlusOne(guest.allow_plus_one || false);
    }
  }, [open, guest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guest) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("guests")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          is_child: isChild,
          allow_plus_one: isChild ? false : allowPlusOne,
        })
        .eq("id", guest.id);

      if (error) throw error;

      toast.success("Invitato aggiornato!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Errore nell'aggiornamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Modifica Invitato
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first-name">Nome *</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Cognome *</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Numero di Telefono</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+39 123 456 7890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Formato consigliato: +39 (prefisso internazionale)
            </p>
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="is-child" className="cursor-pointer">
              È un bambino?
            </Label>
            <Switch
              id="is-child"
              checked={isChild}
              onCheckedChange={(checked) => {
                setIsChild(checked);
                if (checked) setAllowPlusOne(false);
              }}
            />
          </div>

          {!isChild && (
            <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <UserPlus2 className="w-4 h-4 text-purple-600" />
                <div>
                  <Label htmlFor="allow-plus-one" className="cursor-pointer font-medium">
                    Permetti +1
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    L'invitato potrà indicare un accompagnatore
                  </p>
                </div>
              </div>
              <Switch
                id="allow-plus-one"
                checked={allowPlusOne}
                onCheckedChange={setAllowPlusOne}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
