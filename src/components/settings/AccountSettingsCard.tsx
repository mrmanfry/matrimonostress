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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { User, Mail, Bell, UserCircle, KeyRound, AlertTriangle, Loader2, Shield, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AccountSettingsCardProps {
  wedding: {
    id: string;
    partner1_name: string;
    partner2_name: string;
  } | null;
  currentUserId: string | null;
  currentUserRole?: string;
  onUpdate?: () => void;
}

type DeleteMode = "leave_wedding" | "delete_wedding" | "delete_everything";

export const AccountSettingsCard = ({ wedding, currentUserId, currentUserRole, onUpdate }: AccountSettingsCardProps) => {
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
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteMode, setDeleteMode] = useState<DeleteMode | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [hasOtherCoPlanner, setHasOtherCoPlanner] = useState(false);
  const [checkingCoPlanner, setCheckingCoPlanner] = useState(false);

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

  const openDeleteDialog = async () => {
    setDeleteStep(1);
    setDeleteMode(null);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);

    // Check if there's another co_planner on this wedding
    if (wedding?.id && currentUserId) {
      setCheckingCoPlanner(true);
      try {
        const { count } = await supabase
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("wedding_id", wedding.id)
          .eq("role", "co_planner")
          .neq("user_id", currentUserId);

        setHasOtherCoPlanner((count ?? 0) > 0);
      } catch {
        setHasOtherCoPlanner(false);
      } finally {
        setCheckingCoPlanner(false);
      }
    }
  };

  const getDeleteSummary = (): string => {
    if (deleteMode === "leave_wedding") {
      return "Verrai rimosso da questo matrimonio. I dati del matrimonio resteranno disponibili per l'altro proprietario.";
    }
    if (deleteMode === "delete_wedding") {
      return "Tutti i dati di questo matrimonio verranno eliminati permanentemente: invitati, fornitori, pagamenti, checklist, timeline. Se hai altri matrimoni (come Planner), quelli resteranno.";
    }
    if (deleteMode === "delete_everything") {
      return "Il tuo account verrà eliminato completamente dalla piattaforma. Tutti i matrimoni dove sei l'unico proprietario verranno eliminati. Dove c'è un altro co-planner, verrai semplicemente rimosso.";
    }
    return "";
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "ELIMINA" || !deleteMode) return;

    setDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { mode: deleteMode, wedding_id: wedding?.id },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: "Errore", description: data.error, variant: "destructive" });
        setDeletingAccount(false);
        return;
      }

      toast({
        title: deleteMode === "delete_everything" ? "Account eliminato" : "Operazione completata",
        description: data?.message || "Operazione completata con successo",
      });

      setDeleteDialogOpen(false);
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

          {/* Partner Role Mapping - only for co_planner */}
          {wedding && currentUserRole !== 'manager' && currentUserRole !== 'planner' && (
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

          {/* Role info for non-couple users */}
          {(currentUserRole === 'manager' || currentUserRole === 'planner') && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {currentUserRole === 'manager' ? 'Sei un Manager per questo matrimonio' : 'Sei un Planner Professionista per questo matrimonio'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                I tuoi permessi sono configurati dal proprietario del matrimonio
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

      {/* Danger Zone - only for co_planner */}
      {currentUserRole !== 'manager' && currentUserRole !== 'planner' && (
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
                  Elimina i tuoi dati e/o il matrimonio in base al contesto.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={openDeleteDialog}>
                Elimina
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Delete Account Dialog - Multi-step */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialogOpen(false);
          setDeleteStep(1);
          setDeleteMode(null);
          setDeleteConfirmText("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          {deleteStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Cosa vuoi fare?
                </DialogTitle>
                <DialogDescription>
                  Scegli l'azione che vuoi eseguire. Questa operazione è irreversibile.
                </DialogDescription>
              </DialogHeader>

              {checkingCoPlanner ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  {/* Scenario A: Leave wedding (only if another co_planner exists) */}
                  {hasOtherCoPlanner && (
                    <button
                      onClick={() => { setDeleteMode("leave_wedding"); setDeleteStep(2); }}
                      className="w-full text-left p-4 rounded-lg border border-border hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <LogOut className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Lascia questo matrimonio</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Verrai rimosso da questo matrimonio. I dati resteranno per l'altro proprietario.
                          </p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Scenario B: Delete wedding (only if sole owner) */}
                  {!hasOtherCoPlanner && (
                    <button
                      onClick={() => { setDeleteMode("delete_wedding"); setDeleteStep(2); }}
                      className="w-full text-left p-4 rounded-lg border border-border hover:border-destructive/50 hover:bg-destructive/5 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Trash2 className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Elimina questo matrimonio</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Sei l'unico proprietario. Tutti i dati del matrimonio verranno eliminati permanentemente.
                          </p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Scenario C: Delete everything */}
                  <button
                    onClick={() => { setDeleteMode("delete_everything"); setDeleteStep(2); }}
                    className="w-full text-left p-4 rounded-lg border border-destructive/30 hover:border-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-sm text-destructive">Elimina tutto il mio account</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Elimina completamente il tuo account dalla piattaforma. Tutti i matrimoni dove sei l'unico proprietario verranno eliminati.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </>
          )}

          {deleteStep === 2 && deleteMode && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Conferma eliminazione
                </DialogTitle>
                <DialogDescription>
                  {getDeleteSummary()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">
                    ⚠️ Questa azione è irreversibile
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-confirm" className="text-sm">
                    Digita <strong>ELIMINA</strong> per confermare
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                    placeholder="Digita ELIMINA"
                    className="font-mono tracking-wider"
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => { setDeleteStep(1); setDeleteMode(null); setDeleteConfirmText(""); }}
                >
                  Indietro
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "ELIMINA" || deletingAccount}
                >
                  {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {deleteMode === "leave_wedding" ? "Lascia Matrimonio" :
                   deleteMode === "delete_wedding" ? "Elimina Matrimonio" :
                   "Elimina Account"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
