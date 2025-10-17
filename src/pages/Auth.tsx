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
const passwordSchema = z
  .string()
  .min(8, "La password deve avere almeno 8 caratteri")
  .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
  .regex(/[0-9]/, "La password deve contenere almeno un numero");

const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

// Password strength calculator
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

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, label: "", color: "" });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkUserDestination = async (userId: string) => {
    // Controlla se ha creato un wedding
    const { data: weddingData } = await supabase
      .from("weddings")
      .select("id")
      .eq("created_by", userId)
      .maybeSingle();
    
    if (weddingData) return "/app/dashboard";
    
    // Controlla se è stato invitato
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    
    return roleData ? "/app/dashboard" : "/onboarding";
  };

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const destination = await checkUserDestination(session.user.id);
        navigate(destination);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, "Session:", !!session);
      
      if (session) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          const destination = await checkUserDestination(session.user.id);
          setTimeout(() => {
            navigate(destination);
          }, 500);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Real-time password strength update
  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (!isLogin && newPassword) {
      setPasswordStrength(getPasswordStrength(newPassword));
    }
  };

  // Real-time validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!isLogin) {
      try {
        signupSchema.parse({ email, password, confirmPassword, firstName, lastName });
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach((err) => {
            if (err.path[0]) {
              errors[err.path[0] as string] = err.message;
            }
          });
        }
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors({});

    try {
      if (isLogin) {
        // Validate inputs for login
        emailSchema.parse(email);
        passwordSchema.parse(password);
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
        // Validate signup form
        const validation = signupSchema.safeParse({ 
          email, 
          password, 
          confirmPassword, 
          firstName, 
          lastName 
        });

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

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });

        if (error) throw error;

        // CRITICAL: Aspetta che la sessione sia attiva prima di procedere
        if (!data.session) {
          toast({
            title: "Registrazione in corso",
            description: "Attendi mentre configuriamo il tuo account...",
          });
          
          // Aspetta che onAuthStateChange notifichi la sessione
          return;
        }

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
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={validateForm}
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={8}
              className={validationErrors.password ? "border-destructive" : ""}
            />
            {validationErrors.password && (
              <p className="text-sm text-destructive">{validationErrors.password}</p>
            )}
            
            {!isLogin && password && (
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

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={validateForm}
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
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || (!isLogin && Object.keys(validationErrors).length > 0)}
          >
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

        {isLogin && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              disabled={loading}
            >
              Password dimenticata?
            </button>
          </div>
        )}

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
