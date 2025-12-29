import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, LogIn } from "lucide-react";
import { z } from "zod";

const weddingSchema = z.object({
  partner1_name: z.string().trim().min(2, "Il nome deve avere almeno 2 caratteri").max(100),
  partner2_name: z.string().trim().min(2, "Il nome deve avere almeno 2 caratteri").max(100),
  partner2_email: z.string().trim().email("Email non valida").max(255).optional().or(z.literal("")),
  wedding_date: z.string().min(1, "La data è obbligatoria"),
  total_budget: z.number().min(0).optional(),
});

const Onboarding = () => {
  const { authState, refreshAuth } = useAuth();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [partner1Name, setPartner1Name] = useState("");
  const [partner2Name, setPartner2Name] = useState("");
  const [partner2Email, setPartner2Email] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Detect query parameter or pending invitation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeParam = params.get('code');
    
    if (codeParam) {
      setMode('join');
      setAccessCode(codeParam.toUpperCase());
      return;
    }

    // Check for pending invitation - accept both "authenticated" and "no_wedding" states
    const user = (authState.status === "authenticated" || authState.status === "no_wedding") 
      ? authState.user 
      : null;
    
    if (user?.email) {
      supabase
        .from('wedding_invitations')
        .select('wedding_id, role, weddings(partner1_name, partner2_name, access_code)')
        .eq('email', user.email)
        .eq('status', 'pending')
        .maybeSingle()
        .then(({ data }) => {
          if (data && data.weddings) {
            setMode('join');
            setAccessCode(data.weddings.access_code || '');
            toast({
              title: "Invito trovato!",
              description: `Hai un invito per il matrimonio di ${data.weddings.partner1_name} & ${data.weddings.partner2_name}`,
            });
          }
        });
    }
  }, [location, authState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const budgetValue = totalBudget ? parseFloat(totalBudget) : null;

      // Validate
      weddingSchema.parse({
        partner1_name: partner1Name,
        partner2_name: partner2Name,
        partner2_email: partner2Email || "",
        wedding_date: weddingDate,
        total_budget: budgetValue || undefined,
      });

      // Accept both "authenticated" (has wedding) and "no_wedding" (new user without wedding)
      if (authState.status !== "authenticated" && authState.status !== "no_wedding") {
        toast({
          title: "Sessione scaduta",
          description: "Effettua nuovamente l'accesso",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const user = authState.user;
      
      console.log("=== WEDDING CREATION DEBUG ===");
      console.log("User exists:", !!user);
      console.log("User ID:", user.id);

      // Verifica che l'utente sia veramente autenticato facendo una query di test
      const { data: testData, error: testError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      
      console.log("Profile check - Data:", testData, "Error:", testError);

      const weddingPayload = {
        partner1_name: partner1Name,
        partner2_name: partner2Name,
        wedding_date: weddingDate,
        total_budget: budgetValue,
        created_by: user.id,
      };
      
      console.log("Wedding payload:", weddingPayload);

      const { data: weddingData, error: weddingError } = await supabase
        .from("weddings")
        .insert(weddingPayload)
        .select()
        .single();

      console.log("Wedding creation result - Data:", weddingData, "Error:", weddingError);

      if (weddingError) {
        console.error("Wedding creation failed:", weddingError);
        throw weddingError;
      }

      // Generate pre-populated checklist tasks
      if (weddingData) {
        const { generateTasksForWedding } = await import("@/utils/checklistTemplates");
        const tasks = generateTasksForWedding(weddingDate, weddingData.id);
        
        const { error: tasksError } = await supabase
          .from("checklist_tasks")
          .insert(tasks);
        
        if (tasksError) {
          console.error("Error creating checklist tasks:", tasksError);
          // Non blocchiamo l'onboarding se i task falliscono
        }
      }

      // Create invitation if partner2Email is provided
      if (partner2Email) {
        const { error: inviteError } = await supabase
          .from('wedding_invitations')
          .insert({
            wedding_id: weddingData.id,
            email: partner2Email,
            role: 'co_planner',
            invited_by: user.id,
          });

        if (inviteError) {
          console.error('Error creating invitation:', inviteError);
          toast({
            title: "Errore",
            description: "Impossibile creare l'invito per il partner 2",
            variant: "destructive",
          });
        } else {
          // Send invitation email via edge function
          try {
            const { error: emailError } = await supabase.functions.invoke('send-wedding-invitation', {
              body: {
                email: partner2Email,
                weddingNames: `${partner1Name} & ${partner2Name}`,
                weddingDate: weddingDate,
                role: 'co_planner',
                accessCode: weddingData.access_code,
                inviterName: partner1Name,
              },
            });

            if (emailError) {
              console.error('Error sending invitation email:', emailError);
              toast({
                title: "Invito creato",
                description: "L'invito è stato creato ma l'email non è stata inviata. Condividi il codice manualmente.",
                variant: "default",
              });
            } else {
              toast({
                title: "Invito inviato",
                description: `Un'email con il codice è stata inviata a ${partner2Email}`,
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
        }
      }

      toast({
        title: "Perfetto!",
        description: "Il tuo matrimonio è stato creato. Iniziamo!",
      });

      // Refresh auth to load the new wedding_id
      await refreshAuth();
      
      navigate("/app/dashboard");
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

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Accept both "authenticated" (has wedding) and "no_wedding" (new user without wedding)
      if (authState.status !== "authenticated" && authState.status !== "no_wedding") {
        toast({
          title: "Sessione scaduta",
          description: "Effettua nuovamente l'accesso",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const user = authState.user;
      const code = accessCode.trim().toUpperCase();

      if (!code) {
        throw new Error("Inserisci un codice valido");
      }

      // Find wedding with this code
      const { data: wedding, error: weddingError } = await supabase
        .from('weddings')
        .select('id, partner1_name, partner2_name')
        .eq('access_code', code)
        .maybeSingle();

      if (weddingError || !wedding) {
        throw new Error("Codice non valido o matrimonio non trovato");
      }

      // Check if user already has a role for this wedding
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('wedding_id', wedding.id)
        .maybeSingle();

      if (existingRole) {
        throw new Error("Sei già un collaboratore di questo matrimonio");
      }

      // Check for pending invitation for this email
      const { data: invitation } = await supabase
        .from('wedding_invitations')
        .select('role')
        .eq('email', user.email)
        .eq('wedding_id', wedding.id)
        .eq('status', 'pending')
        .maybeSingle();

      const role = invitation?.role || 'manager';

      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          wedding_id: wedding.id,
          role: role
        });

      if (roleError) throw roleError;

      // Update invitation status if exists
      if (invitation) {
        await supabase
          .from('wedding_invitations')
          .update({ status: 'accepted' })
          .eq('email', user.email)
          .eq('wedding_id', wedding.id);
      }

      // Refresh auth context
      await refreshAuth();

      // Wait for auth state to update before navigating
      await new Promise(resolve => setTimeout(resolve, 200));

      toast({
        title: "Accesso effettuato!",
        description: `Ora puoi collaborare al matrimonio di ${wedding.partner1_name} & ${wedding.partner2_name}`,
      });

      navigate("/app/dashboard");
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <Card className="w-full max-w-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-accent/20">
              <Heart className="w-8 h-8 text-accent fill-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Benvenuto!</h1>
          <p className="text-muted-foreground">
            Cosa vuoi fare?
          </p>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "create" | "join")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">
              <Heart className="w-4 h-4 mr-2" />
              Crea Matrimonio
            </TabsTrigger>
            <TabsTrigger value="join">
              <LogIn className="w-4 h-4 mr-2" />
              Ho un Codice
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-6">
            <p className="text-sm text-muted-foreground text-center">
              Iniziamo con le informazioni essenziali per il tuo matrimonio
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="partner1">Nome Partner 1</Label>
                <Input
                  id="partner1"
                  value={partner1Name}
                  onChange={(e) => setPartner1Name(e.target.value)}
                  placeholder="Es. Mario"
                  required
                  disabled={loading}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partner2">Nome Partner 2</Label>
                <Input
                  id="partner2"
                  value={partner2Name}
                  onChange={(e) => setPartner2Name(e.target.value)}
                  placeholder="Es. Laura"
                  required
                  disabled={loading}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partner2Email">Email Partner 2 (opzionale)</Label>
                <Input
                  id="partner2Email"
                  type="email"
                  value={partner2Email}
                  onChange={(e) => setPartner2Email(e.target.value)}
                  placeholder="partner2@email.com"
                  disabled={loading}
                  maxLength={255}
                />
                <p className="text-sm text-muted-foreground">
                  Se fornita, il tuo partner riceverà un invito con il codice di accesso
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data del Matrimonio</Label>
                <Input
                  id="date"
                  type="date"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  required
                  disabled={loading}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget Totale (opzionale)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  placeholder="Es. 20000"
                  disabled={loading}
                  min="0"
                  step="100"
                />
                <p className="text-sm text-muted-foreground">
                  Puoi sempre modificarlo in seguito
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creazione...
                  </>
                ) : (
                  "Inizia l'Avventura"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="join" className="space-y-4 mt-6">
            <p className="text-sm text-muted-foreground text-center">
              Inserisci il codice che hai ricevuto via email
            </p>

            <form onSubmit={handleJoinWithCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessCode">Codice di Accesso</Label>
                <Input
                  id="accessCode"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="WED-XXXX"
                  required
                  disabled={loading}
                  maxLength={8}
                  className="font-mono text-center text-lg tracking-wider"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Il codice è nel formato <strong>WED-XXXX</strong>
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Accesso...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Accedi al Matrimonio
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Onboarding;
