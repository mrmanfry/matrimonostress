import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2 } from "lucide-react";
import { z } from "zod";

const weddingSchema = z.object({
  partner1_name: z.string().trim().min(2, "Il nome deve avere almeno 2 caratteri").max(100),
  partner2_name: z.string().trim().min(2, "Il nome deve avere almeno 2 caratteri").max(100),
  partner2_email: z.string().trim().email("Email non valida").max(255).optional().or(z.literal("")),
  wedding_date: z.string().min(1, "La data è obbligatoria"),
  total_budget: z.number().min(0).optional(),
});

const Onboarding = () => {
  const [partner1Name, setPartner1Name] = useState("");
  const [partner2Name, setPartner2Name] = useState("");
  const [partner2Email, setPartner2Email] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Verifica solo l'autenticazione, non il wedding
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Non autenticato",
          description: "Devi effettuare l'accesso prima di continuare",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
        return;
      }
      
      setCheckingAuth(false);
    };

    checkAuth();
  }, [navigate, toast]);

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

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      console.log("=== WEDDING CREATION DEBUG ===");
      console.log("Session exists:", !!session);
      console.log("User exists:", !!user);
      console.log("User ID:", user?.id);
      console.log("Session access_token:", session?.access_token ? "present" : "missing");
      
      if (!user) {
        toast({
          title: "Sessione scaduta",
          description: "Effettua nuovamente l'accesso",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

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
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { error: inviteError } = await supabase
          .from('wedding_invitations')
          .insert({
            wedding_id: weddingData.id,
            email: partner2Email,
            role: 'co_planner',
            token: token,
            expires_at: expiresAt.toISOString(),
            invited_by: session.user.id,
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
                token: token,
                inviterName: partner1Name,
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
                description: `Un'email è stata inviata a ${partner2Email}`,
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

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
        <Card className="w-full max-w-lg p-8">
          <div className="text-center space-y-4">
            <Heart className="w-12 h-12 text-accent fill-accent animate-pulse mx-auto" />
            <p className="text-muted-foreground">Verifica autenticazione...</p>
          </div>
        </Card>
      </div>
    );
  }

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
            Iniziamo con le informazioni essenziali per il tuo matrimonio
          </p>
        </div>

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
              Se fornita, il tuo partner riceverà un invito per accedere allo spazio matrimonio
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
                <Loader2 className="w-4 h-4 animate-spin" />
                Creazione...
              </>
            ) : (
              "Inizia l'Avventura"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Onboarding;
