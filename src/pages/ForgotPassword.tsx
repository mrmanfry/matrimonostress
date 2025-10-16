import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, ArrowLeft } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email("Email non valida");

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Email inviata!",
        description: "Se l'email è presente nel sistema, riceverai un link per reimpostare la password.",
      });
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
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-accent/20">
              <Heart className="w-8 h-8 text-accent fill-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Password Dimenticata</h1>
          <p className="text-muted-foreground">
            {emailSent 
              ? "Controlla la tua casella email" 
              : "Inserisci la tua email per ricevere un link di recupero"}
          </p>
        </div>

        {!emailSent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tua@email.com"
                required
                disabled={loading}
                maxLength={255}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                "Invia Link di Recupero"
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Ti abbiamo inviato un'email con le istruzioni per reimpostare la tua password.
              Il link sarà valido per 60 minuti.
            </p>
            <Button
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full"
            >
              Invia Nuovamente
            </Button>
          </div>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4" />
            Torna al Login
          </button>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;
