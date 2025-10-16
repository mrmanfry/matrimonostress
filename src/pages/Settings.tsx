import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Users, Shield } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email("Email non valida").max(255);

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
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

      setRoles(rolesData || []);

      // Load pending invites
      const { data: invitesData } = await supabase
        .from("wedding_invitations")
        .select("*")
        .eq("wedding_id", weddingData.id)
        .eq("status", "pending");

      setInvites(invitesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(inviteEmail);

      if (!wedding) throw new Error("Wedding not found");

      // Check max co-planners
      if (inviteRole === "co_planner") {
        const coPlannersCount = roles.filter((r) => r.role === "co_planner").length;
        if (coPlannersCount >= 2) {
          throw new Error("Puoi avere massimo 2 Co-Planner");
        }
      }

      // Check max managers
      if (inviteRole === "manager") {
        const managersCount = roles.filter((r) => r.role === "manager").length;
        if (managersCount >= 2) {
          throw new Error("Puoi avere massimo 2 Manager");
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: inviteError } = await supabase
      .from('wedding_invitations')
      .insert({
        wedding_id: wedding.id,
        email: inviteEmail,
        role: inviteRole,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
      });

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      toast({
        title: "Errore",
        description: "Impossibile creare l'invito",
        variant: "destructive",
      });
      return;
    }

    // Send invitation email via edge function
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const inviterName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Il team'
        : 'Il team';

      const { error: emailError } = await supabase.functions.invoke('send-wedding-invitation', {
        body: {
          email: inviteEmail,
          weddingNames: `${wedding.partner1_name} & ${wedding.partner2_name}`,
          weddingDate: wedding.wedding_date,
          role: inviteRole,
          token: inviteToken,
          inviterName: inviterName,
        },
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        toast({
          title: "Invito creato",
          description: "L'invito è stato creato ma l'email non è stata inviata. Condividi il link manualmente.",
          variant: "default",
        });
      } else {
        toast({
          title: "Invito inviato",
          description: `Un'email è stata inviata a ${inviteEmail}`,
        });
      }
    } catch (emailErr) {
      console.error('Error calling email function:', emailErr);
      toast({
        title: "Invito creato",
        description: "L'invito è stato creato ma l'email non è stata inviata.",
        variant: "default",
      });
    }

    setInviteEmail('');
    setInviteRole('manager');
    loadData();
    } catch (error: any) {
      let errorMessage = "Si è verificato un errore";
      
      if (error instanceof z.ZodError) {
        errorMessage = error.errors[0].message;
      } else {
        errorMessage = error.message;
      }

      toast({
        title: "Errore",
        description: errorMessage,
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
              <option value="manager">Manager (Gestione Operativa)</option>
            </select>
            <p className="text-sm text-muted-foreground">
              Il Manager può gestire invitati, budget e fornitori, ma non può eliminare lo spazio matrimonio.
            </p>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Invio..." : "Crea Invito"}
          </Button>
        </form>
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
