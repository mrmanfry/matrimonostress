import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Users, Shield, Plus, Link2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

const emailSchema = z.string().trim().email("Email non valida").max(255);

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
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load wedding with role check
      const { data: weddingData } = await supabase
        .from("weddings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!weddingData) return;
      setWedding(weddingData);

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
      const { error } = await supabase
        .from("financial_contributors")
        .insert({
          wedding_id: wedding.id,
          name: newContributorName,
          type: "other",
          is_default: false,
        });

      if (error) throw error;

      toast({
        title: "Contributor aggiunto",
        description: "Il contributor è stato aggiunto con successo",
      });

      setNewContributorName("");
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

  const handleUpdateContributor = async (contributorId: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from("financial_contributors")
        .update({ name: newName })
        .eq("id", contributorId);

      if (error) throw error;

      toast({
        title: "Contributor aggiornato",
        description: "Il nome è stato aggiornato con successo",
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
        <h1 className="text-3xl font-bold mb-2">Collaboratori</h1>
        <p className="text-muted-foreground">
          Gestisci chi ha accesso al tuo matrimonio
        </p>
      </div>

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
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-3">
                {getRoleIcon(role.role)}
                <div>
                  <p className="font-medium">Utente ID: {role.user_id.slice(0, 8)}...</p>
                  <p className="text-sm text-muted-foreground">
                    {getRoleLabel(role.role)}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Input
                    value={contributor.name}
                    onChange={(e) => handleUpdateContributor(contributor.id, e.target.value)}
                    className="font-medium"
                    disabled={contributor.is_default}
                  />
                  {contributor.is_default && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Contributor predefinito (non eliminabile)
                    </p>
                  )}
                </div>
                {!contributor.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteContributor(contributor.id, contributor.is_default)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Account collegato info */}
              <div className="flex items-center justify-between">
                {contributor.user_id ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <Link2 className="w-4 h-4" />
                    <span>Account collegato: {contributor.user?.email || 'Utente'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Nessun account collegato</span>
                    {roles.length > 1 && (
                      <Select
                        onValueChange={(userId) => handleLinkContributor(contributor.id, userId)}
                      >
                        <SelectTrigger className="w-[200px] h-8">
                          <SelectValue placeholder="Collega account..." />
                        </SelectTrigger>
                        <SelectContent>
                          {roles
                            .filter(r => !contributors.some(c => c.user_id === r.user_id))
                            .map((role) => (
                              <SelectItem key={role.user_id} value={role.user_id}>
                                {role.profiles?.first_name} {role.profiles?.last_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newContributorName}
            onChange={(e) => setNewContributorName(e.target.value)}
            placeholder="Aggiungi nuovo contributor (es: Genitori, Amico...)"
            onKeyDown={(e) => e.key === 'Enter' && handleAddContributor()}
          />
          <Button onClick={handleAddContributor}>
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi
          </Button>
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
    </div>
  );
};

export default Settings;
