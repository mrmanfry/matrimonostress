import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, UserPlus2, Leaf, Heart, RotateCcw, Mail, Calendar, CheckCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  alias?: string;
  phone?: string;
  is_child: boolean;
  allow_plus_one?: boolean;
  menu_choice?: string;
  dietary_restrictions?: string;
  is_couple_member?: boolean;
  // Campaign fields
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  std_response?: string | null;
  rsvp_status?: string | null;
  rsvp_invitation_sent?: string | null;
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
  const [alias, setAlias] = useState("");
  const [phone, setPhone] = useState("");
  const [isChild, setIsChild] = useState(false);
  const [allowPlusOne, setAllowPlusOne] = useState(false);
  const [menuChoice, setMenuChoice] = useState<string | null>(null);
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Campaign state fields
  const [saveTheDateSent, setSaveTheDateSent] = useState(false);
  const [formalInviteSent, setFormalInviteSent] = useState(false);
  const [stdResponse, setStdResponse] = useState<string | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<string>("pending");
  const [showCampaignSection, setShowCampaignSection] = useState(false);

  useEffect(() => {
    if (open && guest) {
      setFirstName(guest.first_name);
      setLastName(guest.last_name);
      setAlias(guest.alias || "");
      setPhone(guest.phone || "");
      setIsChild(guest.is_child);
      setAllowPlusOne(guest.allow_plus_one || false);
      setMenuChoice(guest.menu_choice || null);
      setDietaryRestrictions(guest.dietary_restrictions || "");
      
      // Campaign fields
      setSaveTheDateSent(!!guest.save_the_date_sent_at);
      setFormalInviteSent(!!guest.formal_invite_sent_at);
      setStdResponse(guest.std_response || null);
      setRsvpStatus(guest.rsvp_status || "pending");
      setShowCampaignSection(false);
    }
  }, [open, guest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guest) return;

    setLoading(true);
    try {
      const updateData: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        alias: alias.trim() || null,
        phone: phone.trim() || null,
        is_child: isChild,
        allow_plus_one: isChild ? false : allowPlusOne,
        menu_choice: menuChoice,
        dietary_restrictions: dietaryRestrictions.trim() || null,
        // Campaign fields
        save_the_date_sent_at: saveTheDateSent ? (guest.save_the_date_sent_at || new Date().toISOString()) : null,
        formal_invite_sent_at: formalInviteSent ? (guest.formal_invite_sent_at || new Date().toISOString()) : null,
        std_response: stdResponse,
        rsvp_status: rsvpStatus,
      };
      
      // If resetting STD, also reset response date
      if (!saveTheDateSent) {
        updateData.std_responded_at = null;
        updateData.std_response = null;
      }

      const { error } = await supabase
        .from("guests")
        .update(updateData)
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

  const resetAllCampaigns = () => {
    setSaveTheDateSent(false);
    setFormalInviteSent(false);
    setStdResponse(null);
    setRsvpStatus("pending");
    toast.info("Stati campagne resettati. Salva per confermare.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {guest?.is_couple_member ? (
              <Heart className="w-5 h-5 text-pink-500" />
            ) : (
              <User className="w-5 h-5" />
            )}
            {guest?.is_couple_member ? "Modifica Sposo/a" : "Modifica Invitato"}
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
            <Label htmlFor="alias">Soprannome / Alias (Opzionale)</Label>
            <Input
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Es: Roby (usato nei messaggi al posto del nome)"
              maxLength={50}
            />
          </div>

          {/* Phone - Hidden for couple members */}
          {!guest?.is_couple_member && (
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
          )}

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

          {!isChild && !guest?.is_couple_member && (
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

          {/* Dietary Preferences Section */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-green-600" />
              <Label className="font-medium">Preferenze Alimentari</Label>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vegetarian"
                  checked={menuChoice === 'vegetariano'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setMenuChoice('vegetariano');
                    } else {
                      setMenuChoice(null);
                    }
                  }}
                />
                <Label htmlFor="vegetarian" className="cursor-pointer text-sm">
                  Sono vegetariano/a
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vegan"
                  checked={menuChoice === 'vegano'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setMenuChoice('vegano');
                    } else {
                      setMenuChoice(null);
                    }
                  }}
                />
                <Label htmlFor="vegan" className="cursor-pointer text-sm">
                  Sono vegano/a
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dietary-restrictions" className="text-sm">
                Allergie o intolleranze (opzionale)
              </Label>
              <Textarea
                id="dietary-restrictions"
                placeholder="Es: lattosio, glutine, frutta a guscio..."
                value={dietaryRestrictions}
                onChange={(e) => setDietaryRestrictions(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Campaign Management Section - Admin Only, Hidden for couple members */}
          {!guest?.is_couple_member && (
            <Collapsible open={showCampaignSection} onOpenChange={setShowCampaignSection}>
              <CollapsibleTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Gestione Stati Campagne
                  </span>
                  <span className="text-xs">{showCampaignSection ? "▲" : "▼"}</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="p-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
                  <p className="text-xs text-orange-700 dark:text-orange-300 mb-3">
                    ⚠️ Modifica questi valori solo se necessario. Il reset riporta l'ospite nella lista "Da contattare".
                  </p>

                  {/* Save The Date Status */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <Label htmlFor="std-sent" className="cursor-pointer text-sm">
                        Save The Date Inviato
                      </Label>
                    </div>
                    <Switch
                      id="std-sent"
                      checked={saveTheDateSent}
                      onCheckedChange={setSaveTheDateSent}
                    />
                  </div>

                  {/* STD Response - only show if STD was sent */}
                  {saveTheDateSent && (
                    <div className="space-y-2 pl-6">
                      <Label className="text-sm">Risposta STD</Label>
                      <Select value={stdResponse || "none"} onValueChange={(v) => setStdResponse(v === "none" ? null : v)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Nessuna risposta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessuna risposta</SelectItem>
                          <SelectItem value="likely_yes">Probabilmente sì ✓</SelectItem>
                          <SelectItem value="likely_no">Probabilmente no ✗</SelectItem>
                          <SelectItem value="unsure">Incerto ?</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Formal Invite Status */}
                  <div className="flex items-center justify-between py-2 mt-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-500" />
                      <Label htmlFor="formal-sent" className="cursor-pointer text-sm">
                        Invito Formale Inviato
                      </Label>
                    </div>
                    <Switch
                      id="formal-sent"
                      checked={formalInviteSent}
                      onCheckedChange={setFormalInviteSent}
                    />
                  </div>

                  {/* RSVP Status */}
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <Label className="text-sm">Stato RSVP</Label>
                    </div>
                    <Select value={rsvpStatus} onValueChange={setRsvpStatus}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">In attesa</SelectItem>
                        <SelectItem value="confirmed">Confermato ✓</SelectItem>
                        <SelectItem value="declined">Rifiutato ✗</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reset Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 text-orange-600 border-orange-300 hover:bg-orange-100"
                    onClick={resetAllCampaigns}
                  >
                    <RotateCcw className="w-3 h-3 mr-2" />
                    Reset Tutti gli Stati
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
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
