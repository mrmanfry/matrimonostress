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

const emailSchema = z.string().trim().email("Email non valida");
const passwordSchema = z.string().min(6, "La password deve avere almeno 6 caratteri");

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/app");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/app");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      emailSchema.parse(email);
      passwordSchema.parse(password);

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        toast({
          title: "Accesso effettuato!",
          description: "Benvenuto su Nozze Senza Stress",
        });
      } else {
        // Additional validation for signup
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error("Nome e cognome sono obbligatori");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Registrazione completata!",
          description: "Ora puoi accedere alla piattaforma",
        });
      }
    } catch (error: any) {
      let errorMessage = "Si è verificato un errore";
      
      if (error instanceof z.ZodError) {
        errorMessage = error.errors[0].message;
      } else if (error.message === "Invalid login credentials") {
        errorMessage = "Email o password non corretti";
      } else if (error.message.includes("already registered")) {
        errorMessage = "Questa email è già registrata. Prova ad accedere.";
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
          <h1 className="text-3xl font-bold">Nozze Senza Stress</h1>
          <p className="text-muted-foreground">
            {isLogin ? "Bentornato!" : "Inizia a pianificare il tuo matrimonio"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Mario"
                  required={!isLogin}
                  disabled={loading}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Cognome</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Rossi"
                  required={!isLogin}
                  disabled={loading}
                  maxLength={50}
                />
              </div>
            </div>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Attendere...
              </>
            ) : isLogin ? (
              "Accedi"
            ) : (
              "Registrati"
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            {isLogin ? (
              <>
                Non hai un account?{" "}
                <span className="text-accent font-semibold">Registrati</span>
              </>
            ) : (
              <>
                Hai già un account?{" "}
                <span className="text-accent font-semibold">Accedi</span>
              </>
            )}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
