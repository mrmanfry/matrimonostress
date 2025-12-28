import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Users, Shield, Plus, Link2, Calendar, DollarSign, Heart, Share2, ExternalLink, Mail, MessageSquare, Settings2, Palette } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ShareProgressDialog } from "@/components/settings/ShareProgressDialog";
import { RSVPConfigDialog } from "@/components/settings/RSVPConfigDialog";
import CampaignCard, { CampaignsConfig } from "@/components/settings/CampaignCard";
import CampaignConfigDialog from "@/components/settings/CampaignConfigDialog";
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

interface ProgressToken {
  id: string;
  token: string;
  expires_at: string;
  is_active: boolean;
  show_checklist: boolean;
  show_vendors: boolean;
  show_timeline: boolean;
  show_countdown: boolean;
}

const getDefaultCampaignsConfig = (): CampaignsConfig => ({
  save_the_date: {
    status: "draft",
    enabled: true,
    hero_image_url: null,
    welcome_title: "Save The Date!",
    welcome_text: "Segnati questa data sul calendario!",
    deadline_date: null,
  },
  rsvp: {
    status: "draft",
    enabled: true,
    hero_image_url: null,
    welcome_title: "Conferma la tua Presenza",
    welcome_text: "Non vediamo l'ora di festeggiare con voi!",
    deadline_date: null,
  },
  theme: {
    layout_mode: "immersive_scroll",
    font_family: "serif",
    primary_color: "#D4AF37",
    show_countdown: true,
    show_powered_by: true,
  },
});

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
  const [progressToken, setProgressToken] = useState<ProgressToken | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [rsvpConfigDialogOpen, setRsvpConfigDialogOpen] = useState(false);
  
  // Campaign dialogs
  const [stdConfigDialogOpen, setStdConfigDialogOpen] = useState(false);
  const [rsvpCampaignDialogOpen, setRsvpCampaignDialogOpen] = useState(false);
  
  // Wedding data edit states
  const [editMode, setEditMode] = useState(false);
  const [editedPartner1, setEditedPartner1] = useState("");
  const [editedPartner2, setEditedPartner2] = useState("");
  const [editedDate, setEditedDate] = useState("");
  const [editedBudget, setEditedBudget] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [editedCeremonyTime, setEditedCeremonyTime] = useState("");
  const [editedTimezone, setEditedTimezone] = useState("Europe/Rome");
  const [savingWeddingData, setSavingWeddingData] = useState(false);
  
  const { toast } = useToast();

  // Get campaigns config with fallback
  const campaignsConfig: CampaignsConfig = wedding?.campaigns_config || getDefaultCampaignsConfig();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("wedding_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!roleData?.wedding_id) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("*")
        .eq("id", roleData.wedding_id)
        .single();

      if (!weddingData) return;
      setWedding(weddingData);
      
      setEditedPartner1(weddingData.partner1_name || "");
      setEditedPartner2(weddingData.partner2_name || "");
      setEditedDate(weddingData.wedding_date || "");
      setEditedBudget(weddingData.total_budget?.toString() || "");
      setEditedLocation(weddingData.location || "");
      setEditedCeremonyTime(weddingData.ceremony_start_time || "");
      setEditedTimezone(weddingData.timezone || "Europe/Rome");

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("*")
        .eq("wedding_id", weddingData.id);

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);

        const rolesWithProfiles = rolesData.map(role => ({
          ...role,
          profiles: profilesData?.find(p => p.id === role.user_id) || undefined
        }));
        setRoles(rolesWithProfiles);
      } else {
        setRoles(rolesData || []);
      }

      const { data: invitesData } = await supabase
        .from("wedding_invitations")
        .select("*")
        .eq("wedding_id", weddingData.id)
        .eq("status", "pending");

      setInvites(invitesData || []);

      const { data: contributorsData } = await supabase
        .from("financial_contributors")
        .select("*")
        .eq("wedding_id", weddingData.id)
        .order("is_default", { ascending: false });

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

      const { data: tokenData } = await supabase
        .from("progress_tokens")
        .select("*")
        .eq("wedding_id", weddingData.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setProgressToken(tokenData);
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

      const { error: inviteError } = await supabase
        .from("wedding_invitations")
        .insert({
          wedding_id: wedding.id,
          email: inviteEmail,
          role: inviteRole,
          invited_by: user.id,
        });

      if (inviteError) throw inviteError;

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

      const { error } = await supabase
        .from("weddings")
        .update({
          partner1_name: editedPartner1,
          partner2_name: editedPartner2,
          wedding_date: editedDate,
          total_budget: budgetValue,
          location: editedLocation || null,
          ceremony_start_time: editedCeremonyTime || null,
          timezone: editedTimezone || "Europe/Rome",
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
    setEditedLocation(wedding?.location || "");
    setEditedCeremonyTime(wedding?.ceremony_start_time || "");
    setEditedTimezone(wedding?.timezone || "Europe/Rome");
  };

  const handleToggleCampaignStatus = async (campaignType: "save_the_date" | "rsvp") => {
    if (!wedding) return;
    
    try {
      const currentStatus = campaignsConfig[campaignType].status;
      const newStatus = currentStatus === "active" ? "draft" : "active";
      
      const updatedConfig = {
        ...campaignsConfig,
        [campaignType]: {
          ...campaignsConfig[campaignType],
          status: newStatus,
        },
      };

      const { error } = await supabase
        .from("weddings")
        .update({ campaigns_config: updatedConfig as any })
        .eq("id", wedding.id);

      if (error) throw error;

      toast({
        title: newStatus === "active" ? "Campagna attivata" : "Campagna in pausa",
        description: newStatus === "active" 
          ? "La campagna è ora attiva e visibile agli invitati"
          : "La campagna è stata messa in pausa",
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

  const handlePreviewCampaign = (campaignType: "save_the_date" | "rsvp") => {
    // Open RSVP public page in new tab
    const mode = campaignType === "save_the_date" ? "std" : "rsvp";
    // We need a guest token for preview - for now just show a toast
    toast({
      title: "Anteprima",
      description: "Per vedere l'anteprima, invia un invito di test a te stesso dalla sezione Invitati",
    });
  };

  if (!wedding) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Impostazioni</h1>
        <p className="text-muted-foreground">
          Gestisci i dati del matrimonio, le comunicazioni e i collaboratori
        </p>
      </div>

      <Tabs defaultValue="wedding" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="wedding" className="gap-2">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Matrimonio</span>
          </TabsTrigger>
          <TabsTrigger value="communications" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Comunicazioni</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB: Matrimonio */}
        <TabsContent value="wedding" className="space-y-6 mt-6">
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
                      <Label htmlFor="ceremony_time" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Orario Inizio Cerimonia
                      </Label>
                      <Input
                        id="ceremony_time"
                        type="time"
                        value={editedCeremonyTime}
                        onChange={(e) => setEditedCeremonyTime(e.target.value)}
                        placeholder="16:00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Usato per l'evento calendario (default 16:00)
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="location" className="flex items-center gap-2">
                        Località
                      </Label>
                      <Input
                        id="location"
                        value={editedLocation}
                        onChange={(e) => setEditedLocation(e.target.value)}
                        placeholder="Es: Villa Rossi, Roma"
                        maxLength={200}
                      />
                      <p className="text-xs text-muted-foreground">
                        Verrà usata come indirizzo nell'evento calendario
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Fuso Orario</Label>
                      <Select value={editedTimezone} onValueChange={setEditedTimezone}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona fuso orario" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Europe/Rome">🇮🇹 Italia (Europe/Rome)</SelectItem>
                          <SelectItem value="Europe/London">🇬🇧 Regno Unito (Europe/London)</SelectItem>
                          <SelectItem value="Europe/Paris">🇫🇷 Francia (Europe/Paris)</SelectItem>
                          <SelectItem value="Europe/Berlin">🇩🇪 Germania (Europe/Berlin)</SelectItem>
                          <SelectItem value="Europe/Madrid">🇪🇸 Spagna (Europe/Madrid)</SelectItem>
                          <SelectItem value="America/New_York">🇺🇸 New York (America/New_York)</SelectItem>
                          <SelectItem value="America/Los_Angeles">🇺🇸 Los Angeles (America/Los_Angeles)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
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
                💡 Il codice non scade mai e può essere usato più volte.
              </p>
            </CardContent>
          </Card>

          {/* Share Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-500" />
                Condividi Progresso
              </CardTitle>
              <CardDescription>
                Crea un link pubblico per mostrare il progresso a parenti e amici
              </CardDescription>
            </CardHeader>
            <CardContent>
              {progressToken ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input 
                      value={`${window.location.origin}/progress/${progressToken.token}`} 
                      readOnly 
                      className="text-sm"
                    />
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/progress/${progressToken.token}`);
                        toast({ title: "Copiato!", description: "Link copiato negli appunti" });
                      }}
                    >
                      <Link2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(`${window.location.origin}/progress/${progressToken.token}`, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Scade il: {new Date(progressToken.expires_at).toLocaleDateString("it-IT")}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
                      Modifica Visibilità
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShareDialogOpen(true)} className="w-full md:w-auto gap-2">
                  <Share2 className="w-4 h-4" />
                  Crea Link Pubblico
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Comunicazioni Invitati */}
        <TabsContent value="communications" className="space-y-6 mt-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Campagne di Comunicazione
            </h2>
            <p className="text-muted-foreground">
              Gestisci le pagine che vedranno i tuoi invitati quando ricevono il link
            </p>
          </div>

          {/* Campaign Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <CampaignCard
              type="save_the_date"
              config={campaignsConfig.save_the_date}
              stats={{ sent: 0, responded: 0 }}
              onConfigure={() => setStdConfigDialogOpen(true)}
              onPreview={() => handlePreviewCampaign("save_the_date")}
              onToggleStatus={() => handleToggleCampaignStatus("save_the_date")}
            />
            
            <CampaignCard
              type="rsvp"
              config={campaignsConfig.rsvp}
              stats={{ sent: 0, responded: 0 }}
              onConfigure={() => setRsvpCampaignDialogOpen(true)}
              onPreview={() => handlePreviewCampaign("rsvp")}
              onToggleStatus={() => handleToggleCampaignStatus("rsvp")}
            />
          </div>

          {/* Theme Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Stile Globale
              </CardTitle>
              <CardDescription>
                Queste impostazioni vengono applicate a tutte le pagine pubbliche
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Font:</span>
                  <span className="font-medium capitalize">{campaignsConfig.theme.font_family}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Colore:</span>
                  <div 
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: campaignsConfig.theme.primary_color }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Countdown:</span>
                  <span className="font-medium">{campaignsConfig.theme.show_countdown ? "Sì" : "No"}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                💡 Modifica lo stile dalla configurazione di ciascuna campagna
              </p>
            </CardContent>
          </Card>

          {/* Legacy RSVP Config (for backward compatibility) */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Configurazione Legacy (RSVP)
              </CardTitle>
              <CardDescription>
                Impostazioni precedenti della pagina RSVP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setRsvpConfigDialogOpen(true)} variant="outline" size="sm">
                Apri Configurazione Legacy
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Team & Collaboratori */}
        <TabsContent value="team" className="space-y-6 mt-6">
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
                    ? "Il Co-Planner ha controllo totale sul matrimonio."
                    : "Il Manager può gestire invitati, budget e fornitori."}
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
                      <Label htmlFor={`target-${contributor.id}`} className="text-xs">Target (€)</Label>
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
                                <SelectValue placeholder="Seleziona collaboratore..." />
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
                              💡 Invita un collaboratore per collegarlo
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
                  placeholder="Nome (es: Genitori)"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddContributor()}
                  className="flex-1"
                />
                <Input
                  value={newContributorTarget}
                  onChange={(e) => setNewContributorTarget(e.target.value)}
                  placeholder="Target € (opzionale)"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddContributor()}
                  className="flex-1"
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
              <li>• <strong>Manager</strong>: Gestione operativa (massimo 2)</li>
              <li>• Tutti i dati sono protetti con Row Level Security</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ShareProgressDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        weddingId={wedding?.id || ""}
        existingToken={progressToken}
        onTokenCreated={(token) => {
          setProgressToken(token);
          loadData();
        }}
        onTokenDeleted={() => {
          setProgressToken(null);
          setShareDialogOpen(false);
        }}
      />

      <RSVPConfigDialog
        open={rsvpConfigDialogOpen}
        onOpenChange={setRsvpConfigDialogOpen}
        weddingId={wedding?.id || ""}
        currentConfig={(wedding?.rsvp_config as any) || null}
        onSave={() => loadData()}
      />

      <CampaignConfigDialog
        open={stdConfigDialogOpen}
        onOpenChange={setStdConfigDialogOpen}
        weddingId={wedding?.id || ""}
        campaignType="save_the_date"
        currentConfig={campaignsConfig}
        partnerNames={`${wedding?.partner1_name} & ${wedding?.partner2_name}`}
        weddingDate={wedding?.wedding_date || ""}
        onSave={() => loadData()}
      />

      <CampaignConfigDialog
        open={rsvpCampaignDialogOpen}
        onOpenChange={setRsvpCampaignDialogOpen}
        weddingId={wedding?.id || ""}
        campaignType="rsvp"
        currentConfig={campaignsConfig}
        partnerNames={`${wedding?.partner1_name} & ${wedding?.partner2_name}`}
        weddingDate={wedding?.wedding_date || ""}
        onSave={() => loadData()}
      />

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
