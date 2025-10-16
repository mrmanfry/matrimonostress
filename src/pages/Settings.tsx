import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, X, Loader2, Users as UsersIcon, Shield } from "lucide-react";
import { z } from "zod";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

const Settings = () => {
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<UserRole[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"co_planner" | "manager">("manager");
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get wedding
      const { data: weddings } = await supabase
        .from("weddings")
        .select("id")
        .limit(1)
        .single();

      if (!weddings) return;
      setWeddingId(weddings.id);

      // Get current user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("wedding_id", weddings.id)
        .eq("user_id", user.id)
        .single();

      setCurrentRole(roleData?.role || null);

      // Get collaborators
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          role
        `)
        .eq("wedding_id", weddings.id);

      // Fetch profiles separately
      if (rolesData) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds);

        const enrichedRoles = rolesData.map(role => ({
          ...role,
          profiles: profilesData?.find(p => p.id === role.user_id) || { first_name: "", last_name: "" }
        }));

        setCollaborators(enrichedRoles as UserRole[]);
      }

      // Get pending invitations
      const { data: invitesData } = await supabase
        .from("wedding_invitations")
        .select("*")
        .eq("wedding_id", weddings.id)
        .eq("status", "pending");

      setInvitations(invitesData || []);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingId) return;

    setInviting(true);
    try {
      // Validate email
      z.string().email().parse(inviteEmail);

      // Check if already invited or has access
      const existingRole = collaborators.find(c => 
        c.profiles?.first_name && inviteEmail.toLowerCase().includes(c.user_id)
      );
      if (existingRole) {
        throw new Error("Questo utente ha già accesso");
      }

      const existingInvite = invitations.find(i => 
        i.email.toLowerCase() === inviteEmail.toLowerCase()
      );
      if (existingInvite) {
        throw new Error("Invito già inviato a questa email");
      }

      // Check co_planner limit (max 2)
      if (inviteRole === "co_planner") {
        const coPlannersCount = collaborators.filter(c => c.role === "co_planner").length;
        if (coPlannersCount >= 2) {
          throw new Error("Puoi avere massimo 2 Co-Planner");
        }
      }

      // Check manager limit (max 2)
      if (inviteRole === "manager") {
        const managersCount = collaborators.filter(c => c.role === "manager").length;
        if (managersCount >= 2) {
          throw new Error("Puoi avere massimo 2 Manager");
        }
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from("wedding_invitations").insert({
        wedding_id: weddingId,
        invited_by: (await supabase.auth.getUser()).data.user?.id,
        email: inviteEmail,
        role: inviteRole,
        token,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Invito inviato!",
        description: `Un'email è stata inviata a ${inviteEmail}`,
      });

      setInviteEmail("");
      loadSettings();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setInviting(false);
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
        description: "L'invito è stato annullato",
      });

      loadSettings();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const isCoPlanner = currentRole === "co_planner";

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Impostazioni</h1>
        <p className="text-muted-foreground">Gestisci collaboratori e permessi</p>
      </div>

      {/* Current Collaborators */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <UsersIcon className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold">Collaboratori Attivi</h2>
        </div>

        <div className="space-y-3">
          {collaborators.map((collab) => (
            <div
              key={collab.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {collab.profiles?.first_name} {collab.profiles?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {collab.role === "co_planner" ? "Co-Planner" : "Manager"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Invite New Collaborator - Only for Co-Planners */}
      {isCoPlanner && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-semibold">Invita Collaboratore</h2>
          </div>

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
                disabled={inviting}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Ruolo</Label>
              <select
                id="role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "co_planner" | "manager")}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
                disabled={inviting}
              >
                <option value="co_planner">Co-Planner (Controllo totale)</option>
                <option value="manager">Manager (Gestione operativa)</option>
              </select>
              <p className="text-sm text-muted-foreground">
                {inviteRole === "co_planner" 
                  ? "Co-Planner: accesso completo a tutte le funzionalità"
                  : "Manager: può gestire invitati, budget e checklist ma non eliminare lo spazio"}
              </p>
            </div>

            <Button type="submit" disabled={inviting} className="w-full">
              {inviting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Invio...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invia Invito
                </>
              )}
            </Button>
          </form>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="font-semibold mb-3">Inviti in Sospeso</h3>
              <div className="space-y-2">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {invite.role === "co_planner" ? "Co-Planner" : "Manager"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevokeInvite(invite.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {!isCoPlanner && (
        <Card className="p-6 bg-muted/30">
          <p className="text-center text-muted-foreground">
            Solo i Co-Planner possono invitare nuovi collaboratori
          </p>
        </Card>
      )}
    </div>
  );
};

export default Settings;
