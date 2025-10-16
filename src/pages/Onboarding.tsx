import { useState } from "react";
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
  wedding_date: z.string().min(1, "La data è obbligatoria"),
  total_budget: z.number().min(0).optional(),
});

const Onboarding = () => {
  const [partner1Name, setPartner1Name] = useState("");
  const [partner2Name, setPartner2Name] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const budgetValue = totalBudget ? parseFloat(totalBudget) : null;

      // Validate
      weddingSchema.parse({
        partner1_name: partner1Name,
        partner2_name: partner2Name,
        wedding_date: weddingDate,
        total_budget: budgetValue || undefined,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("weddings").insert({
        partner1_name: partner1Name,
        partner2_name: partner2Name,
        wedding_date: weddingDate,
        total_budget: budgetValue,
        created_by: user.id,
      });

      if (error) throw error;

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
