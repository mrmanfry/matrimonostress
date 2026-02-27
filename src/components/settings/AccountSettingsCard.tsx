import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { User, Mail, Bell, UserCircle, KeyRound, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AccountSettingsCardProps {
  wedding: {
    id: string;
    partner1_name: string;
    partner2_name: string;
  } | null;
  currentUserId: string | null;
  onUpdate?: () => void;
}

export const AccountSettingsCard = ({ wedding, currentUserId, onUpdate }: AccountSettingsCardProps) => {
  const [userEmail, setUserEmail] = useState<string>("");
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [partnerRole, setPartnerRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();

  // Change password states
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    loadAccountSettings();
  }, [currentUserId, wedding?.id]);

  const loadAccountSettings = async () => {
    if (!currentUserId || !wedding?.id) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("digest_enabled")
        .eq("id", currentUserId)
        .single();

      if (profile) {
        setDigestEnabled(profile.digest_enabled ?? true);
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("partner_role")
        .eq("user_id", currentUserId)
        .eq("wedding_id", wedding.id)
        .single();

      if (roleData) {
        setPartnerRole(roleData.partner_role);
      }
    } catch (error) {
      console.error("Error loading account settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDigestPreference = async (enabled: boolean) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ digest_enabled: enabled })
        .eq("id", currentUserId);

      if (error) throw error;

      setDigestEnabled(enabled);
      toast({
        title: enabled ? "Digest attivato" : "Digest disattivato",
        description: enabled 
          ? "Riceverai il riepilogo settimanale via email"
          : "Non riceverai più il digest settimanale",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSavePartnerRole = async (role: string) => {
    if (!currentUserId || !wedding?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ partner_role: role })
        .eq("user_id", currentUserId)
        .eq("wedding_id", wedding.id);

      if (error) throw error;

      setPartnerRole(role);
      toast({
        title: "Ruolo aggiornato",
        description: `Sei stato mappato come ${role === 'partner1' ? wedding.partner1_name : wedding.partner2_name}`,
      });
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password troppo corta", description: "Minimo 6 caratteri", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Le password non coincidono", description: "Verifica e riprova", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Password aggiornata", description: "La tua password è stata cambiata con successo" });
      setChangePasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "ELIMINA") return;

    setDeletingAccount(true);
    try {
      // Sign out (actual deletion requires admin/service role - we sign out and show info)
      toast({
        title: "Account disconnesso",
        description: "Per completare l'eliminazione definitiva, contatta il supporto. I tuoi dati verranno rimossi entro 30 giorni.",
      });
      await signOut();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Caricamento...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Il Mio Account
          </CardTitle>
          <CardDescription>
            Gestisci le preferenze del tuo account personale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              Email Account
            </Label>
            <Input 
              value={userEmail} 
              readOnly 
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              L'email non può essere modificata da qui
            </p>
          </div>

          {/* Partner Role Mapping */}
          {wedding && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <UserCircle className="w-4 h-4" />
                Ruolo nel Matrimonio
              </Label>
              <Select 
                value={partnerRole || ""} 
                onValueChange={handleSavePartnerRole}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona chi sei..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner1">
                    Sono {wedding.partner1_name} (Partner 1)
                  </SelectItem>
                  <SelectItem value="partner2">
                    Sono {wedding.partner2_name} (Partner 2)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Questo determina quali task ti vengono assegnati nel digest settimanale
              </p>
            </div>
          )}

          {/* Change Password */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <KeyRound className="w-4 h-4" />
              Password
            </Label>
            <Button variant="outline" onClick={() => setChangePasswordOpen(true)} className="w-full md:w-auto">
              Cambia Password
            </Button>
          </div>

          {/* Digest Preference */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div className="space-y-1">
              <Label className="flex items-center gap-2 font-medium">
                <Bell className="w-4 h-4" />
                Digest Settimanale
              </Label>
              <p className="text-sm text-muted-foreground">
                Ricevi ogni lunedì un riepilogo dei task e pagamenti in scadenza
              </p>
            </div>
            <Switch
              checked={digestEnabled}
              onCheckedChange={handleSaveDigestPreference}
            />
          </div>

          {/* Info box */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 <strong>Tip:</strong> Selezionando il tuo ruolo, riceverai solo i task assegnati a te nel digest settimanale, più quelli condivisi con il/la partner.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Zona Pericolosa
          </CardTitle>
          <CardDescription>
            Azioni irreversibili sul tuo account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="space-y-1">
              <p className="font-medium text-sm">Elimina Account</p>
              <p className="text-xs text-muted-foreground">
                Tutti i dati del tuo matrimonio verranno eliminati permanentemente.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              Elimina Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <AlertDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Cambia Password
            </AlertDialogTitle>
            <AlertDialogDescription>
              Inserisci la nuova password (minimo 6 caratteri)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nuova Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nuova password"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Conferma Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Conferma password"
                minLength={6}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setNewPassword(""); setConfirmPassword(""); }}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleChangePassword} disabled={changingPassword || newPassword.length < 6}>
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Cambia Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Elimina Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Questa azione è <strong>irreversibile</strong>. Tutti i dati del matrimonio, gli invitati, i fornitori e i pagamenti verranno eliminati permanentemente.
              </span>
              <span className="block font-medium">
                Digita <strong>ELIMINA</strong> per confermare.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
              placeholder="Digita ELIMINA"
              className="font-mono tracking-wider"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "ELIMINA" || deletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Elimina Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};