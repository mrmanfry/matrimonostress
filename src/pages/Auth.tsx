import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, ArrowLeft, ArrowRight, Mail, Lock } from "lucide-react";
import { z } from "zod";
import { sessionGuard } from "@/utils/sessionGuard";
import Logo from "@/components/Logo";

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
  const [rememberMe, setRememberMe] = useState(true);
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

        if (rememberMe) sessionGuard.markAsPersistent();
        else sessionGuard.markAsVolatile();

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

        if (rememberMe) sessionGuard.markAsPersistent();
        else sessionGuard.markAsVolatile();

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app/dashboard` },
        });

        if (error) throw error;

        if (!data.session) {
          toast({
            title: "Registrazione in corso",
            description: "Attendi mentre configuriamo il tuo account...",
          });
          return;
        }

        toast({ title: "Registrazione completata!", description: "Ora puoi accedere alla piattaforma" });
      }
    } catch (error: any) {
      let errorMessage = "Si è verificato un errore";
      if (error instanceof z.ZodError) errorMessage = error.errors[0].message;
      else if (error.message === "Invalid login credentials") errorMessage = "Email o password non corretti";
      else if (error.message?.includes("already registered")) errorMessage = "Questa email è già registrata. Prova ad accedere.";
      else errorMessage = error.message;
      toast({ title: "Errore", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ========= LEFT: Form (cream/ivory) ========= */}
      <div className="w-full lg:w-1/2 flex flex-col bg-[hsl(35_40%_96%)] relative">
        <div className="flex-1 flex flex-col px-8 sm:px-12 lg:px-16 xl:px-24 py-8">
          {/* Back link */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm text-[hsl(0_0%_30%)] hover:text-[hsl(0_0%_10%)] transition-colors mb-12 self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna al sito
          </button>

          {/* Tabs Accedi / Crea account */}
          <div className="bg-[hsl(35_30%_92%)] rounded-full p-1.5 flex w-full max-w-md mb-10">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setValidationErrors({}); }}
              className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${
                isLogin
                  ? "bg-white text-[hsl(0_0%_10%)] shadow-sm"
                  : "text-[hsl(0_0%_40%)] hover:text-[hsl(0_0%_20%)]"
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setValidationErrors({}); }}
              className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${
                !isLogin
                  ? "bg-white text-[hsl(0_0%_10%)] shadow-sm"
                  : "text-[hsl(0_0%_40%)] hover:text-[hsl(0_0%_20%)]"
              }`}
            >
              Crea account
            </button>
          </div>

          {/* Headline */}
          <div className="max-w-md mb-8">
            <h1 className="text-5xl sm:text-6xl leading-[1.05] text-[hsl(0_0%_8%)]" style={{ fontFamily: "'Fraunces', 'EB Garamond', serif", fontWeight: 400 }}>
              {isLogin ? (
                <>Bentornati,<br /><em className="italic text-[hsl(258_89%_66%)] font-normal">sposi.</em></>
              ) : (
                <>Iniziate il<br /><em className="italic text-[hsl(258_89%_66%)] font-normal">vostro viaggio.</em></>
              )}
            </h1>
            <p className="mt-5 text-[hsl(0_0%_35%)] text-base leading-relaxed">
              {isLogin
                ? "Riprendete da dove avete lasciato. Tutti i vostri preparativi sono al sicuro."
                : "Create il vostro spazio privato. Budget, invitati e fornitori in un unico posto."}
            </p>
          </div>

          {/* Google */}
          <div className="max-w-md w-full">
            <Button
              type="button"
              variant="outline"
              className="w-full h-14 text-base bg-white border-[hsl(0_0%_85%)] hover:bg-[hsl(0_0%_98%)] rounded-2xl font-medium text-[hsl(0_0%_15%)]"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continua con Google
            </Button>

            {/* Divider */}
            <div className="relative my-6 flex items-center">
              <div className="flex-grow border-t border-dashed border-[hsl(0_0%_75%)]" />
              <span className="px-4 text-[10px] tracking-[0.2em] text-[hsl(0_0%_45%)] uppercase">Oppure con email</span>
              <div className="flex-grow border-t border-dashed border-[hsl(0_0%_75%)]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-[hsl(0_0%_20%)]">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0_0%_50%)]" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tua@email.com"
                    required
                    disabled={loading}
                    maxLength={255}
                    className="h-14 pl-11 bg-white border-[hsl(0_0%_85%)] rounded-2xl text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-[hsl(0_0%_20%)]">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0_0%_50%)]" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={8}
                    className={`h-14 pl-11 pr-12 bg-white border-[hsl(0_0%_85%)] rounded-2xl text-base ${validationErrors.password ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(0_0%_50%)] hover:text-[hsl(0_0%_20%)] transition-colors"
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
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[hsl(0_0%_45%)]">Robustezza:</span>
                      <span className="text-[hsl(0_0%_25%)]">{passwordStrength.label}</span>
                    </div>
                    <div className="h-1.5 bg-[hsl(0_0%_88%)] rounded-full overflow-hidden">
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
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-[hsl(0_0%_20%)]">Conferma password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0_0%_50%)]" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      minLength={8}
                      className={`h-14 pl-11 bg-white border-[hsl(0_0%_85%)] rounded-2xl text-base ${validationErrors.confirmPassword ? "border-destructive" : ""}`}
                    />
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="text-sm text-destructive">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              )}

              {/* Remember + forgot row */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    disabled={loading}
                    className="data-[state=checked]:bg-[hsl(258_89%_66%)] data-[state=checked]:border-[hsl(258_89%_66%)]"
                  />
                  <Label htmlFor="rememberMe" className="text-sm text-[hsl(0_0%_30%)] cursor-pointer select-none">
                    Resta collegato
                  </Label>
                </div>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-sm font-medium text-[hsl(258_89%_66%)] hover:underline"
                    disabled={loading}
                  >
                    Password dimenticata?
                  </button>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-base rounded-2xl bg-[hsl(0_0%_10%)] hover:bg-[hsl(0_0%_18%)] text-white font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Attendere...
                  </>
                ) : (
                  <>
                    {isLogin ? "Accedi al tuo spazio" : "Crea il tuo spazio"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Switch */}
            <div className="text-center mt-6 pt-6 border-t border-dashed border-[hsl(0_0%_80%)]">
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setValidationErrors({}); }}
                className="text-sm text-[hsl(0_0%_35%)] hover:text-[hsl(0_0%_15%)] transition-colors"
                disabled={loading}
              >
                {isLogin ? (
                  <>Non hai un account? <span className="text-[hsl(258_89%_66%)] font-semibold">Registrati</span></>
                ) : (
                  <>Hai già un account? <span className="text-[hsl(258_89%_66%)] font-semibold">Accedi</span></>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 sm:px-12 lg:px-16 xl:px-24 py-6 flex items-center justify-between text-xs text-[hsl(0_0%_45%)] border-t border-[hsl(0_0%_88%)]">
          <span>© {new Date().getFullYear()} WedsApp</span>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="hover:text-[hsl(0_0%_20%)]">Privacy</a>
            <a href="/termini" className="hover:text-[hsl(0_0%_20%)]">Termini</a>
            <a href="/aiuto" className="hover:text-[hsl(0_0%_20%)]">Aiuto</a>
          </div>
        </div>
      </div>

      {/* ========= RIGHT: Brand panel (purple) ========= */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(258 70% 60%) 0%, hsl(263 65% 55%) 50%, hsl(255 60% 50%) 100%)" }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/[0.06] blur-2xl" />
        <div className="absolute bottom-0 -left-20 w-[400px] h-[400px] rounded-full bg-white/[0.05] blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Top: Logo (white variant for dark panel) */}
          <div className="flex items-center">
            <Logo variant="white" size={44} alt="WedsApp" />
          </div>

          {/* Center: Hero text + Tesoreria card */}
          <div className="space-y-10 max-w-xl">
            <div className="space-y-5">
              <h2 className="text-5xl xl:text-6xl text-white leading-[1.05]" style={{ fontFamily: "'Fraunces', 'EB Garamond', serif", fontWeight: 400 }}>
                Il vostro matrimonio,<br />
                <em className="italic text-white/90 font-normal">sotto controllo.</em>
              </h2>
              <p className="text-base text-white/75 leading-relaxed max-w-md">
                Budget, invitati, fornitori e checklist in un unico posto.
                Niente più fogli Excel e chat infinite.
              </p>
            </div>

            {/* Tesoreria mock card */}
            <div className="rounded-3xl bg-white/[0.08] backdrop-blur-md border border-white/15 p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-white/90 italic text-lg" style={{ fontFamily: "'Fraunces', serif" }}>Tesoreria</span>
                <span className="text-xs text-white/90 bg-white/15 rounded-full px-3 py-1 font-medium">78%</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-white/70 text-2xl">€</span>
                <span className="text-white text-4xl xl:text-5xl font-light tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>26.800</span>
                <span className="text-white/50 text-sm ml-1">/ 34.500</span>
              </div>
              <div className="mt-5 space-y-2.5">
                {[
                  { label: "Location", value: 86 },
                  { label: "Catering", value: 84 },
                  { label: "Fotografo", value: 68 },
                  { label: "Fiori", value: 51 },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-[80px_1fr_36px] items-center gap-3 text-xs">
                    <span className="text-white/70">{row.label}</span>
                    <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.value}%`, background: "hsl(42 78% 75%)" }}
                      />
                    </div>
                    <span className="text-white/70 text-right">{row.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom: Social proof */}
          <div className="rounded-2xl bg-white/[0.07] backdrop-blur-sm border border-white/15 px-5 py-4 flex items-center gap-4">
            <div className="flex -space-x-2">
              {["L", "G", "S"].map((c, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-[hsl(258_60%_55%)] bg-[hsl(35_40%_92%)] flex items-center justify-center text-[hsl(258_60%_45%)] text-sm font-semibold"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {c}
                </div>
              ))}
            </div>
            <div className="leading-tight">
              <div className="text-white text-sm font-medium">Coppie che hanno scelto di organizzare senza stress</div>
              <div className="text-white/60 text-xs mt-0.5">+ centinaia di matrimoni in tutta Italia</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
