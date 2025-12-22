import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { guestSchema, type GuestFormData } from "@/lib/validationSchemas";
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
import { Leaf } from "lucide-react";

interface Guest {
  id?: string;
  first_name: string;
  last_name: string;
  alias?: string;
  rsvp_status: string;
  adults_count: number;
  children_count: number;
  menu_choice: string;
  dietary_restrictions: string;
  notes: string;
  group_id: string | null;
  allow_plus_one?: boolean;
}

interface GuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: Guest | null;
  groups: Array<{ id: string; name: string }>;
  onSave: (guest: Guest) => Promise<void>;
}

const emptyGuest = {
  first_name: "",
  last_name: "",
  alias: "",
  rsvp_status: "pending" as const,
  adults_count: 1,
  children_count: 0,
  menu_choice: "",
  dietary_restrictions: "",
  notes: "",
  group_id: undefined,
  allow_plus_one: false,
};

export function GuestDialog({
  open,
  onOpenChange,
  guest,
  groups,
  onSave,
}: GuestDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: emptyGuest,
  });

  const rsvpStatus = watch("rsvp_status");
  const groupId = watch("group_id");

  useEffect(() => {
    if (guest) {
      const guestRsvpStatus = ["pending", "confirmed", "declined"].includes(guest.rsvp_status)
        ? guest.rsvp_status as GuestFormData["rsvp_status"]
        : "pending" as GuestFormData["rsvp_status"];
      
      reset({
        first_name: guest.first_name,
        last_name: guest.last_name,
        alias: guest.alias || "",
        rsvp_status: guestRsvpStatus,
        adults_count: guest.adults_count,
        children_count: guest.children_count,
        menu_choice: guest.menu_choice || "",
        dietary_restrictions: guest.dietary_restrictions || "",
        notes: guest.notes || "",
        group_id: guest.group_id || undefined,
        allow_plus_one: guest.allow_plus_one || false,
      });
    } else {
      reset(emptyGuest);
    }
  }, [guest, open, reset]);

  const onSubmit = async (data: GuestFormData) => {
    try {
      const guestData = {
        ...data,
        id: guest?.id,
        first_name: data.first_name,
        last_name: data.last_name,
        alias: data.alias?.trim() || null,
        rsvp_status: data.rsvp_status,
        adults_count: data.adults_count,
        children_count: data.children_count,
        menu_choice: data.menu_choice || "",
        dietary_restrictions: data.dietary_restrictions || "",
        notes: data.notes || "",
        group_id: data.group_id || null,
        allow_plus_one: data.allow_plus_one || false,
      };
      await onSave(guestData as Guest);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving guest:", error);
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nome *</Label>
              <Input
                id="first_name"
                {...register("first_name")}
                maxLength={100}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Cognome *</Label>
              <Input
                id="last_name"
                {...register("last_name")}
                maxLength={100}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alias">Soprannome / Alias (Opzionale)</Label>
            <Input
              id="alias"
              {...register("alias")}
              placeholder="Es: Roby (usato nei messaggi al posto del nome)"
              maxLength={50}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rsvp_status">Stato RSVP</Label>
              <Select
                value={rsvpStatus}
                onValueChange={(value) => setValue("rsvp_status", value as GuestFormData["rsvp_status"])}
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
                value={groupId || "none"}
                onValueChange={(value) => setValue("group_id", value === "none" ? null : value)}
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
                {...register("adults_count", { valueAsNumber: true })}
              />
              {errors.adults_count && (
                <p className="text-sm text-destructive">{errors.adults_count.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="children_count">N° Bambini</Label>
              <Input
                id="children_count"
                type="number"
                min="0"
                max="20"
                {...register("children_count", { valueAsNumber: true })}
              />
              {errors.children_count && (
                <p className="text-sm text-destructive">{errors.children_count.message}</p>
              )}
            </div>
          </div>

          {/* Preferenze Alimentari */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-primary" />
              Preferenze alimentari
            </Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vegetarian"
                  checked={watch("menu_choice") === "vegetariano"}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setValue("menu_choice", "vegetariano");
                    } else if (watch("menu_choice") === "vegetariano") {
                      setValue("menu_choice", "");
                    }
                  }}
                />
                <Label htmlFor="vegetarian" className="text-sm font-normal cursor-pointer">
                  Vegetariano/a
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vegan"
                  checked={watch("menu_choice") === "vegano"}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setValue("menu_choice", "vegano");
                    } else if (watch("menu_choice") === "vegano") {
                      setValue("menu_choice", "");
                    }
                  }}
                />
                <Label htmlFor="vegan" className="text-sm font-normal cursor-pointer">
                  Vegano/a
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dietary_restrictions">
              Restrizioni Alimentari / Allergie
            </Label>
            <Textarea
              id="dietary_restrictions"
              {...register("dietary_restrictions")}
              placeholder="Es: Celiaco, vegano, allergia ai crostacei"
              rows={2}
              maxLength={500}
            />
            {errors.dietary_restrictions && (
              <p className="text-sm text-destructive">{errors.dietary_restrictions.message}</p>
            )}
          </div>

          {/* Plus One Permission */}
          <div className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-muted/30">
            <Checkbox
              id="allow_plus_one"
              checked={watch("allow_plus_one") || false}
              onCheckedChange={(checked) => {
                setValue("allow_plus_one", !!checked);
              }}
            />
            <div className="flex-1">
              <Label htmlFor="allow_plus_one" className="cursor-pointer font-medium">
                Permetti +1 (accompagnatore)
              </Label>
              <p className="text-xs text-muted-foreground">
                L'invitato potrà indicare un accompagnatore nel form RSVP
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Informazioni aggiuntive"
              rows={3}
              maxLength={1000}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
