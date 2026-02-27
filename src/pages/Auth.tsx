import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { sessionGuard } from "@/utils/sessionGuard";
import { Sparkles } from "lucide-react";

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
  if (strength <= 2) return { strength: 33, label: "Debole", color: "bg-destructive" };
  if (strength <= 4) return { strength: 66, label: "Media", color: "bg-status-urgent" };
  return { strength: 100, label: "Forte", color: "bg-status-confirmed" };
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, label: "", color: "" });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && window.location.pathname === "/auth") {
        setTimeout(() => {
          if (window.location.pathname === "/auth") {
            navigate("/app/dashboard");
          }
        }, 500);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (!isLogin && newPassword) {
      setPasswordStrength(getPasswordStrength(newPassword));
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'accesso con Google",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors({});

    try {
      if (isLogin) {
        emailSchema.parse(email);
        passwordSchema.parse(password);

        if (rememberMe) {
          sessionGuard.markAsPersistent();
        } else {
          sessionGuard.markAsVolatile();
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        toast({
          title: "Accesso effettuato!",
          description: rememberMe
            ? "Resterai collegato su questo dispositivo"
            : "La sessione terminerà alla chiusura del browser",
        });
      } else {
        const validation = signupSchema.safeParse({ email, password, confirmPassword });
        if (!validation.success) {
          const errors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) errors[err.path[0] as string] = err.message;
          });
          setValidationErrors(errors);
          throw new Error(Object.values(errors)[0]);
        }

        if (rememberMe) {
          sessionGuard.markAsPersistent();
        } else {
          sessionGuard.markAsVolatile();
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app/dashboard`,
          },
        });

        if (error) throw error;

        if (!data.session) {
          toast({
            title: "Registrazione in corso",
            description: "Attendi mentre configuriamo il tuo account...",
          });
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
      } else if (error.message?.includes("already registered")) {
        errorMessage = "Questa email è già registrata. Prova ad accedere.";
      } else {
        errorMessage = error.message;
      }
      toast({ title: "Errore", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div className="w-full max-w-md mx-auto flex flex-col justify-center min-h-screen lg:min-h-0 px-6 py-8 lg:py-0">
      <div className="text-center space-y-2 mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-accent">
            <Heart className="w-8 h-8 text-accent-foreground fill-accent-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold font-serif">Nozze Senza Stress</h1>
        <p className="text-muted-foreground">
          {isLogin ? "Bentornato!" : "Inizia a organizzare il tuo matrimonio"}
        </p>
      </div>

      {/* Google OAuth */}
      <Button
        variant="outline"
        className="w-full h-12 text-base mb-2"
        onClick={handleGoogleSignIn}
        disabled={loading || googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        Continua con Google
      </Button>

      <div className="relative my-6">
        <Separator />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-card px-3 text-xs text-muted-foreground uppercase">oppure</span>
        </div>
      </div>

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

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={8}
              className={`pr-10 ${validationErrors.password ? "border-destructive" : ""}`}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {validationErrors.password && (
            <p className="text-sm text-destructive">{validationErrors.password}</p>
          )}
          {!isLogin && password && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Robustezza:</span>
                <span>{passwordStrength.label}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
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
              type={showPassword ? "text" : "password"}
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
        )}

        <div className="flex items-center space-x-2 py-1">
          <Checkbox
            id="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            disabled={loading}
          />
          <Label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer select-none">
            Resta collegato su questo dispositivo
          </Label>
        </div>

        <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Attendere...
            </>
          ) : isLogin ? "Accedi" : "Crea Account"}
        </Button>
      </form>

      {isLogin && (
        <div className="text-center mt-4">
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

      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => { setIsLogin(!isLogin); setValidationErrors({}); }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          disabled={loading}
        >
          {isLogin ? (
            <>Non hai un account? <span className="text-accent-foreground font-semibold">Registrati</span></>
          ) : (
            <>Hai già un account? <span className="text-accent-foreground font-semibold">Accedi</span></>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Left: Elegant branded panel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-accent via-accent/80 to-primary/60">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 -right-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 left-1/4 w-64 h-64 rounded-full bg-white/8" />
        <div className="absolute top-1/4 left-1/3 w-40 h-40 rounded-full border border-white/10" />
        
        {/* Subtle dot pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top: Logo area */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
              <Heart className="w-6 h-6 text-white fill-white/80" />
            </div>
            <span className="text-white/90 font-serif text-lg font-semibold tracking-wide">Nozze Senza Stress</span>
          </div>

          {/* Center: Main message */}
          <div className="space-y-6">
            <h2 className="text-5xl font-serif font-bold text-white leading-tight">
              Il tuo matrimonio,<br />
              <span className="text-white/80">sotto controllo.</span>
            </h2>
            <p className="text-lg text-white/70 max-w-sm leading-relaxed">
              Budget, invitati, fornitori e checklist in un unico posto. 
              Niente più fogli Excel e chat infinite.
            </p>
            
            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              {["Tesoreria smart", "Lista invitati", "Gestione fornitori", "Checklist"].map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-sm text-white/90 border border-white/10"
                >
                  <Sparkles className="w-3 h-3" />
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom: Social proof */}
          <div className="space-y-3">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border-2 border-accent bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xs font-semibold"
                >
                  {["L", "F", "G", "S"][i]}
                </div>
              ))}
              <div className="w-9 h-9 rounded-full border-2 border-accent bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 text-xs">
                +
              </div>
            </div>
            <p className="text-sm text-white/60">
              Coppie che hanno già scelto di organizzare senza stress
            </p>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-card">
        {formContent}
      </div>
    </div>
  );
};

export default Auth;
