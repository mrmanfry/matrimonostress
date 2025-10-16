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

const passwordSchema = z
  .string()
  .min(8, "La password deve avere almeno 8 caratteri")
  .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
  .regex(/[0-9]/, "La password deve contenere almeno un numero");

const resetSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  if (strength <= 2) return { strength: 33, label: "Debole", color: "bg-red-500" };
  if (strength <= 4) return { strength: 66, label: "Media", color: "bg-yellow-500" };
  return { strength: 100, label: "Forte", color: "bg-green-500" };
};

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, label: "", color: "" });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid session (user clicked reset link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidToken(true);
      } else {
        toast({
          title: "Link non valido",
          description: "Il link di recupero password è scaduto o non valido.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/forgot-password"), 3000);
      }
    });
  }, [navigate, toast]);

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (newPassword) {
      setPasswordStrength(getPasswordStrength(newPassword));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors({});

    try {
      const validation = resetSchema.safeParse({ password, confirmPassword });

      if (!validation.success) {
        const errors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
        throw new Error(Object.values(errors)[0]);
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Password reimpostata!",
        description: "Ora puoi accedere con la tua nuova password.",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => navigate("/auth"), 2000);
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

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifica in corso...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-accent/20">
              <Heart className="w-8 h-8 text-accent fill-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Nuova Password</h1>
          <p className="text-muted-foreground">
            Scegli una password sicura per il tuo account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nuova Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={8}
              className={validationErrors.password ? "border-destructive" : ""}
            />
            {validationErrors.password && (
              <p className="text-sm text-destructive">{validationErrors.password}</p>
            )}
            
            {password && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Robustezza password:</span>
                  <span className={passwordStrength.strength === 100 ? "text-green-600" : passwordStrength.strength === 66 ? "text-yellow-600" : "text-red-600"}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.strength}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Conferma Nuova Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={8}
              className={validationErrors.confirmPassword ? "border-destructive" : ""}
            />
            {validationErrors.confirmPassword && (
              <p className="text-sm text-destructive">{validationErrors.confirmPassword}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || Object.keys(validationErrors).length > 0}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aggiornamento...
              </>
            ) : (
              "Reimposta Password"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
