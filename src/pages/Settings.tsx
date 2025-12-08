import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Users, Shield, Plus, Link2, Calendar, DollarSign, Heart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { z } from "zod";

const emailSchema = z.string().trim().email("Email non valida").max(255);

const weddingDataSchema = z.object({
  partner1_name: z.string().trim().min(1, "Nome obbligatorio").max(100, "Massimo 100 caratteri"),
  partner2_name: z.string().trim().min(1, "Nome obbligatorio").max(100, "Massimo 100 caratteri"),
  wedding_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  total_budget: z.number().min(0, "Il budget deve essere positivo").optional(),
});

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  status: string;
}

const Settings = () => {
  const [wedding, setWedding] = useState<any>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"co_planner" | "manager" | "guest">("manager");
  const [loading, setLoading] = useState(false);
  const [contributors, setContributors] = useState<any[]>([]);
  const [newContributorName, setNewContributorName] = useState("");
  const [newContributorTarget, setNewContributorTarget] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  
  // Wedding data edit states
  const [editMode, setEditMode] = useState(false);
  const [editedPartner1, setEditedPartner1] = useState("");
  const [editedPartner2, setEditedPartner2] = useState("");
  const [editedDate, setEditedDate] = useState("");
  const [editedBudget, setEditedBudget] = useState("");
  const [savingWeddingData, setSavingWeddingData] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      // Get weddingId from user_roles first (safer than limit(1))
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("wedding_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!roleData?.wedding_id) return;

      // Load wedding with explicit ID filter
      const { data: weddingData } = await supabase
        .from("weddings")
        .select("*")
        .eq("id", roleData.wedding_id)
        .single();

      if (!weddingData) return;
      setWedding(weddingData);
      
      // Initialize edit states
      setEditedPartner1(weddingData.partner1_name || "");
      setEditedPartner2(weddingData.partner2_name || "");
      setEditedDate(weddingData.wedding_date || "");
      setEditedBudget(weddingData.total_budget?.toString() || "");

      // Load roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("*")
        .eq("wedding_id", weddingData.id);

      // Load profiles for users with roles
      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);

        // Combine roles with profiles
        const rolesWithProfiles = rolesData.map(role => ({
          ...role,
          profiles: profilesData?.find(p => p.id === role.user_id) || undefined
        }));
        setRoles(rolesWithProfiles);
      } else {
        setRoles(rolesData || []);
      }

      // Load pending invites
      const { data: invitesData } = await supabase
        .from("wedding_invitations")
        .select("*")
        .eq("wedding_id", weddingData.id)
        .eq("status", "pending");

      setInvites(invitesData || []);

      // Load financial contributors
      const { data: contributorsData } = await supabase
        .from("financial_contributors")
        .select("*")
        .eq("wedding_id", weddingData.id)
        .order("is_default", { ascending: false });

      // Load profiles for contributors with user_id
      if (contributorsData) {
        const contributorUserIds = contributorsData
          .filter(c => c.user_id)
          .map(c => c.user_id);
        
        if (contributorUserIds.length > 0) {
          const { data: userProfilesData } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", contributorUserIds);

          const contributorsWithUsers = contributorsData.map(contributor => {
            if (contributor.user_id) {
              const userProfile = userProfilesData?.find(p => p.id === contributor.user_id);
              return {
                ...contributor,
                user: userProfile ? {
                  id: userProfile.id,
                  email: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Utente'
                } : null
              };
            }
            return contributor;
          });
          setContributors(contributorsWithUsers);
        } else {
          setContributors(contributorsData);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(inviteEmail);

      if (!wedding) {
        throw new Error("Wedding not found");
      }

      // Check role limits
      if (inviteRole === "co_planner") {
        const coPlannersCount = roles.filter((r) => r.role === "co_planner").length;
        if (coPlannersCount >= 2) {
          throw new Error("Puoi avere massimo 2 Co-Planner (incluso te stesso)");
        }
      }

      if (inviteRole === "manager") {
        const managersCount = roles.filter((r) => r.role === "manager").length;
        if (managersCount >= 2) {
          throw new Error("Puoi avere massimo 2 Manager");
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Insert invitation for tracking (no token needed)
      const { error: inviteError } = await supabase
        .from("wedding_invitations")
        .insert({
          wedding_id: wedding.id,
          email: inviteEmail,
          role: inviteRole,
          invited_by: user.id,
        });

      if (inviteError) throw inviteError;

      // Get inviter profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const inviterName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Il team'
        : 'Il team';

      // Send invitation email with access code
      const { error: emailError } = await supabase.functions.invoke('send-wedding-invitation', {
        body: {
          email: inviteEmail,
          weddingNames: `${wedding.partner1_name} & ${wedding.partner2_name}`,
          weddingDate: wedding.wedding_date,
          role: inviteRole,
          accessCode: wedding.access_code,
          inviterName: inviterName,
        },
      });

      if (emailError) throw emailError;

      toast({
        title: "Invito inviato",
        description: `Un'email con il codice di accesso è stata inviata a ${inviteEmail}. Quando accetta, potrai collegarlo come contributor.`,
      });

      setInviteEmail('');
      setInviteRole('manager');
      await loadData();
    } catch (error: any) {
      console.error("Error sending invite:", error);
      toast({
        title: "Errore",
        description: error.message === "Wedding not found"
          ? "Matrimonio non trovato"
          : error.message.includes("massimo")
          ? error.message
          : "Impossibile inviare l'invito. Riprova.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("wedding_invitations")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;

      toast({
        title: "Invito revocato",
        description: "L'invito è stato eliminato",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "co_planner":
        return "Co-Planner";
      case "manager":
        return "Manager";
      case "guest":
        return "Ospite";
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "co_planner":
        return <Shield className="w-4 h-4 text-accent" />;
      case "manager":
        return <Users className="w-4 h-4 text-gold" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const handleAddContributor = async () => {
    if (!newContributorName.trim()) {
      toast({
        title: "Nome mancante",
        description: "Inserisci il nome del contributor",
        variant: "destructive",
      });
      return;
    }

    try {
      const contributionTarget = newContributorTarget.trim() 
        ? parseFloat(newContributorTarget.replace(/[^0-9.,]/g, '').replace(',', '.'))
        : null;

      const { error } = await supabase
        .from("financial_contributors")
        .insert({
          wedding_id: wedding.id,
          name: newContributorName,
          type: "other",
          is_default: false,
          contribution_target: contributionTarget,
        });

      if (error) throw error;

      toast({
        title: "Contributor aggiunto",
        description: "Il contributor è stato aggiunto con successo",
      });

      setNewContributorName("");
      setNewContributorTarget("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteContributor = async (contributorId: string, isDefault: boolean) => {
    if (isDefault) {
      toast({
        title: "Non eliminabile",
        description: "Non puoi eliminare i contributor predefiniti",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("financial_contributors")
        .delete()
        .eq("id", contributorId);

      if (error) throw error;

      toast({
        title: "Contributor eliminato",
        description: "Il contributor è stato rimosso con successo",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateContributor = async (contributorId: string, newName: string, newTarget?: string) => {
    if (!newName.trim()) return;

    try {
      const updateData: any = { name: newName };
      
      if (newTarget !== undefined) {
        const parsedTarget = newTarget.trim() 
          ? parseFloat(newTarget.replace(/[^0-9.,]/g, '').replace(',', '.'))
          : null;
        updateData.contribution_target = parsedTarget;
      }

      const { error } = await supabase
        .from("financial_contributors")
        .update(updateData)
        .eq("id", contributorId);

      if (error) throw error;

      toast({
        title: "Contributor aggiornato",
        description: "Le informazioni sono state aggiornate con successo",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLinkContributor = async (contributorId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from("financial_contributors")
        .update({ user_id: userId })
        .eq("id", contributorId);

      if (error) throw error;

      toast({
        title: "Account collegato",
        description: "Il contributor è stato collegato all'utente",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveCollaborator = async () => {
    if (!roleToDelete) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleToDelete);

      if (error) throw error;

      toast({
        title: "Collaboratore rimosso",
        description: "Il collaboratore è stato rimosso con successo",
      });

      setRoleToDelete(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      setRoleToDelete(null);
    }
  };

  const handleSaveWeddingData = async () => {
    if (!wedding) return;
    
    setSavingWeddingData(true);
    try {
      // Parse and validate
      const budgetValue = editedBudget.trim() 
        ? parseFloat(editedBudget.replace(/[^0-9.,]/g, '').replace(',', '.'))
        : undefined;

      const validationResult = weddingDataSchema.safeParse({
        partner1_name: editedPartner1,
        partner2_name: editedPartner2,
        wedding_date: editedDate,
        total_budget: budgetValue,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      // Update wedding data
      const { error } = await supabase
        .from("weddings")
        .update({
          partner1_name: editedPartner1,
          partner2_name: editedPartner2,
          wedding_date: editedDate,
          total_budget: budgetValue,
        })
        .eq("id", wedding.id);

      if (error) throw error;

      toast({
        title: "Dati aggiornati",
        description: "I dati del matrimonio sono stati aggiornati con successo",
      });

      setEditMode(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare le modifiche",
        variant: "destructive",
      });
    } finally {
      setSavingWeddingData(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedPartner1(wedding?.partner1_name || "");
    setEditedPartner2(wedding?.partner2_name || "");
    setEditedDate(wedding?.wedding_date || "");
    setEditedBudget(wedding?.total_budget?.toString() || "");
  };

  if (!wedding) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Impostazioni</h1>
        <p className="text-muted-foreground">
          Gestisci i dati del matrimonio e i collaboratori
        </p>
      </div>

      {/* Wedding Data Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            Dati del Matrimonio
          </CardTitle>
          <CardDescription>
            Modifica i dati principali del tuo matrimonio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!editMode ? (
            // View Mode
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Nome Sposo/a 1</Label>
                  <p className="text-lg font-medium">{wedding.partner1_name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Nome Sposo/a 2</Label>
                  <p className="text-lg font-medium">{wedding.partner2_name}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data del Matrimonio
                  </Label>
                  <p className="text-lg font-medium">
                    {new Date(wedding.wedding_date).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Budget Totale Prefissato
                  </Label>
                  <p className="text-lg font-medium">
                    {wedding.total_budget 
                      ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(wedding.total_budget)
                      : "Non impostato"}
                  </p>
                </div>
              </div>
              <Button onClick={() => setEditMode(true)} variant="outline" className="w-full md:w-auto">
                Modifica Dati
              </Button>
            </>
          ) : (
            // Edit Mode
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="partner1">Nome Sposo/a 1 *</Label>
                  <Input
                    id="partner1"
                    value={editedPartner1}
                    onChange={(e) => setEditedPartner1(e.target.value)}
                    placeholder="Es: Mario"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partner2">Nome Sposo/a 2 *</Label>
                  <Input
                    id="partner2"
                    value={editedPartner2}
                    onChange={(e) => setEditedPartner2(e.target.value)}
                    placeholder="Es: Laura"
                    maxLength={100}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wedding_date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data del Matrimonio *
                  </Label>
                  <Input
                    id="wedding_date"
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_budget" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Budget Totale (€)
                  </Label>
                  <Input
                    id="total_budget"
                    type="text"
                    value={editedBudget}
                    onChange={(e) => setEditedBudget(e.target.value)}
                    placeholder="Es: 35000"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={handleSaveWeddingData} 
                  disabled={savingWeddingData}
                  className="flex-1 md:flex-initial"
                >
                  {savingWeddingData ? "Salvataggio..." : "Salva Modifiche"}
                </Button>
                <Button 
                  onClick={handleCancelEdit} 
                  variant="outline"
                  disabled={savingWeddingData}
                  className="flex-1 md:flex-initial"
                >
                  Annulla
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Codice di Accesso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔐 Codice di Accesso
          </CardTitle>
          <CardDescription>
            Condividi questo codice con chi vuoi che collabori al matrimonio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input 
              value={wedding?.access_code || ''} 
              readOnly 
              className="font-mono text-lg font-bold text-center tracking-wider"
            />
            <Button 
              variant="outline"
              onClick={() => {
                if (wedding?.access_code) {
                  navigator.clipboard.writeText(wedding.access_code);
                  toast({
                    title: "Codice copiato!",
                    description: "Il codice è stato copiato negli appunti",
                  });
                }
              }}
            >
              Copia
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            💡 Il codice non scade mai e può essere usato più volte. I collaboratori possono inserirlo dopo aver effettuato il login.
          </p>
        </CardContent>
      </Card>

      {/* Current Collaborators */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Collaboratori Attivi ({roles.length})
        </h2>
        <div className="space-y-3">
          {roles.map((role) => {
            const isCurrentUser = role.user_id === currentUserId;
            const userName = role.profiles?.first_name && role.profiles?.last_name
              ? `${role.profiles.first_name} ${role.profiles.last_name}`
              : `Utente ID: ${role.user_id.slice(0, 8)}...`;

            return (
              <div
                key={role.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {getRoleIcon(role.role)}
                  <div>
                    <p className="font-medium">
                      {userName}
                      {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(Tu)</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getRoleLabel(role.role)}
                    </p>
                  </div>
                </div>
                {!isCurrentUser && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRoleToDelete(role.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Inviti in Sospeso</h2>
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
              >
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {getRoleLabel(invite.role)} • Invitato il{" "}
                    {new Date(invite.created_at).toLocaleDateString("it-IT")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRevokeInvite(invite.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Invite New Collaborator */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Invita Collaboratore
        </h2>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="collaboratore@email.com"
              required
              disabled={loading}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Ruolo</Label>
            <select
              id="role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="w-full p-2 rounded-md border border-input bg-background"
              disabled={loading}
            >
              <option value="co_planner">Co-Planner (Controllo Totale)</option>
              <option value="manager">Manager (Gestione Operativa)</option>
            </select>
            <p className="text-sm text-muted-foreground">
              {inviteRole === "co_planner" 
                ? "Il Co-Planner ha controllo totale sul matrimonio, inclusa la possibilità di eliminarlo."
                : "Il Manager può gestire invitati, budget e fornitori, ma non può eliminare lo spazio matrimonio."}
            </p>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Invio..." : "Crea Invito"}
          </Button>
        </form>
      </Card>

      {/* Financial Contributors Section */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          💰 Gestione Contributi Finanziari
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Gestisci chi può pagare le spese. Questi nomi appariranno nei piani di pagamento.
        </p>

        <div className="space-y-3 mb-4">
          {contributors.map((contributor) => (
            <div
              key={contributor.id}
              className="p-3 rounded-lg bg-muted/30 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`name-${contributor.id}`} className="text-xs">Nome</Label>
                  <Input
                    id={`name-${contributor.id}`}
                    value={contributor.name}
                    onChange={(e) => handleUpdateContributor(contributor.id, e.target.value)}
                    className="font-medium"
                    disabled={contributor.is_default}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`target-${contributor.id}`} className="text-xs">Target di Contribuzione (€)</Label>
                  <Input
                    id={`target-${contributor.id}`}
                    type="text"
                    placeholder="es. 5000"
                    defaultValue={contributor.contribution_target || ""}
                    onBlur={(e) => handleUpdateContributor(contributor.id, contributor.name, e.target.value)}
                    className="font-mono"
                  />
                </div>
                {!contributor.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteContributor(contributor.id, contributor.is_default)}
                    className="self-end"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {contributor.is_default && (
                <p className="text-xs text-muted-foreground">
                  Contributor predefinito (non eliminabile)
                </p>
              )}

              {/* Account collegato info */}
              <div className="space-y-2">
                {contributor.user_id ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <Link2 className="w-4 h-4" />
                    <span>Account collegato: {contributor.user?.email || 'Utente'}</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Nessun account collegato</p>
                    {(() => {
                      const availableRoles = roles.filter(r => !contributors.some(c => c.user_id === r.user_id));
                      return availableRoles.length > 0 ? (
                        <Select
                          onValueChange={(userId) => handleLinkContributor(contributor.id, userId)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleziona collaboratore da collegare..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map((role) => (
                              <SelectItem key={role.user_id} value={role.user_id}>
                                {role.profiles?.first_name} {role.profiles?.last_name} ({getRoleLabel(role.role)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          💡 Invita un collaboratore qui sopra per poterlo collegare come contributor
                        </p>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Aggiungi Nuovo Contributor</Label>
          <div className="flex gap-2">
            <Input
              value={newContributorName}
              onChange={(e) => setNewContributorName(e.target.value)}
              placeholder="Nome (es: Genitori Ludo)"
              onKeyDown={(e) => e.key === 'Enter' && handleAddContributor()}
              className="flex-1"
            />
            <Input
              value={newContributorTarget}
              onChange={(e) => setNewContributorTarget(e.target.value)}
              placeholder="Target € (opzionale)"
              onKeyDown={(e) => e.key === 'Enter' && handleAddContributor()}
              className="flex-1"
              type="text"
            />
            <Button onClick={handleAddContributor}>
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi
            </Button>
          </div>
        </div>
      </Card>

      <div className="p-4 rounded-lg bg-muted/30">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" />
          Sistema di Ruoli Sicuro
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Co-Planner</strong>: Controllo totale (massimo 2)</li>
          <li>• <strong>Manager</strong>: Gestione operativa senza permessi distruttivi (massimo 2)</li>
          <li>• Tutti i dati sono protetti con Row Level Security</li>
        </ul>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Rimozione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rimuovere questo collaboratore? Perderà l'accesso a tutte le funzionalità del matrimonio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveCollaborator}>
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
