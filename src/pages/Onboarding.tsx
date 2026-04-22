import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, ArrowRight, ArrowLeft, CalendarDays, UserPlus, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear + i);

const Onboarding = () => {
  const { authState, refreshAuth } = useAuth();
  const [searchParams] = useSearchParams();
  const joinCodeFromUrl = searchParams.get("join") || "";

  // "choice" = step 0, "create" = original flow, "join" = join flow
  const [flow, setFlow] = useState<"choice" | "create" | "join">(
    joinCodeFromUrl ? "join" : "choice"
  );

  const [step, setStep] = useState(1);
  const [partner1Name, setPartner1Name] = useState("");
  const [partner2Name, setPartner2Name] = useState("");
  const [userRole, setUserRole] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [isTentativeDate, setIsTentativeDate] = useState(false);
  const [tentativeMonth, setTentativeMonth] = useState("");
  const [tentativeYear, setTentativeYear] = useState(String(currentYear + 1));
  const [loading, setLoading] = useState(false);

  // Join flow state
  const [joinCode, setJoinCode] = useState(joinCodeFromUrl);
  const [joining, setJoining] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canProceedStep1 = partner1Name.trim().length >= 2 && partner2Name.trim().length >= 2 && userRole;

  const canProceedStep2 = isTentativeDate
    ? (tentativeMonth && tentativeYear)
    : weddingDate.length > 0;

  const resolveDate = (): string => {
    if (!isTentativeDate) return weddingDate;
    const monthIdx = MONTHS.indexOf(tentativeMonth);
    const m = String(monthIdx + 1).padStart(2, "0");
    return `${tentativeYear}-${m}-15`;
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc('join_wedding_by_code', {
        p_access_code: joinCode.trim(),
      });
      if (error) throw error;
      const result = data as any;
      if (result?.error) throw new Error(result.error);

      await refreshAuth();
      queryClient.invalidateQueries();

      toast({
        title: "Accesso effettuato! 🎉",
        description: "Ora puoi collaborare a questo matrimonio",
      });
      navigate("/app/dashboard");
    } catch (error: any) {
      console.error("Error joining wedding:", error);
      toast({
        title: "Errore",
        description: error.message || "Codice non valido o scaduto",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      if (authState.status !== "authenticated" && authState.status !== "no_wedding") {
        toast({ title: "Sessione scaduta", description: "Effettua nuovamente l'accesso", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const user = authState.user;
      const finalDate = resolveDate();

      // Guards: enforce "1 wedding per couple" and planner slot limits
      if (userRole !== "wedding_planner") {
        const { data: ownsCouple } = await supabase.rpc("user_owns_couple_wedding", {
          p_user_id: user.id,
        });
        if (ownsCouple) {
          toast({
            title: "Hai già un matrimonio",
            description: "Il piano Coppia copre 1 matrimonio. Per gestirne altri, passa al piano Planner.",
            variant: "destructive",
          });
          setLoading(false);
          navigate("/app/upgrade/planner");
          return;
        }
      } else {
        const [{ data: plannerSub }, { data: activeCount }] = await Promise.all([
          supabase
            .from("planner_subscriptions")
            .select("slot_limit, subscription_status, trial_ends_at")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase.rpc("count_active_planner_weddings", { p_user_id: user.id }),
        ]);
        const slotsUsed = (activeCount as number) || 0;
        const limit = plannerSub?.slot_limit ?? 1;
        const isActive =
          plannerSub?.subscription_status === "active" ||
          (plannerSub?.subscription_status === "trialing" &&
            plannerSub?.trial_ends_at &&
            new Date(plannerSub.trial_ends_at).getTime() > Date.now());
        const effectiveLimit = isActive ? limit : 1;
        if (slotsUsed >= effectiveLimit) {
          toast({
            title: "Limite slot raggiunto",
            description: `Hai ${slotsUsed}/${effectiveLimit} matrimoni attivi. Aggiorna il piano per gestirne altri.`,
            variant: "destructive",
          });
          setLoading(false);
          navigate("/app/upgrade/planner");
          return;
        }
      }


      const { data: weddingData, error: weddingError } = await supabase
        .from("weddings")
        .insert({
          partner1_name: partner1Name.trim(),
          partner2_name: partner2Name.trim(),
          wedding_date: finalDate,
          created_by: user.id,
          is_date_tentative: isTentativeDate,
          user_role_type: userRole,
        })
        .select()
        .single();

      if (weddingError) throw weddingError;

      // If user is a wedding planner, update the auto-assigned co_planner role to planner
      if (userRole === 'wedding_planner' && weddingData) {
        try {
          await supabase
            .from("user_roles")
            .update({ role: 'planner' as any, permissions_config: { budget_visible: false, vendor_costs_visible: true } })
            .eq("user_id", user.id)
            .eq("wedding_id", weddingData.id);
        } catch (err) {
          console.error("Error updating planner role:", err);
        }
      }

      // Generate pre-populated checklist tasks
      if (weddingData) {
        try {
          const { generateTasksForWedding } = await import("@/utils/checklistTemplates");
          const tasks = generateTasksForWedding(finalDate, weddingData.id);
          await supabase.from("checklist_tasks").insert(tasks);
        } catch (err) {
          console.error("Error creating checklist tasks:", err);
        }
      }

      toast({
        title: "Perfetto! 🎉",
        description: "Il tuo matrimonio è stato creato. Iniziamo!",
      });

      await refreshAuth();
      navigate("/app/dashboard");
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 0: Choice screen ──
  if (flow === "choice") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-accent">
                <Heart className="w-7 h-7 text-accent-foreground fill-accent-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold font-serif">Benvenuto su WedsApp!</h1>
            <p className="text-sm text-muted-foreground">
              Come vuoi iniziare?
            </p>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full h-14 text-base justify-start gap-3"
              onClick={() => setFlow("create")}
            >
              <Plus className="w-5 h-5" />
              Crea un Nuovo Matrimonio
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">oppure</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              variant="outline"
              className="w-full h-14 text-base justify-start gap-3"
              onClick={() => setFlow("join")}
            >
              <UserPlus className="w-5 h-5" />
              Ho un codice di invito
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Join flow ──
  if (flow === "join") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-accent">
                <UserPlus className="w-7 h-7 text-accent-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold font-serif">Unisciti a un Matrimonio</h1>
            <p className="text-sm text-muted-foreground">
              Inserisci il codice di accesso che hai ricevuto via email
            </p>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleJoin(); }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="joinCode">Codice di Accesso</Label>
              <Input
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="WED-XXXX"
                className="font-mono uppercase text-center text-lg"
                maxLength={8}
                required
                disabled={joining}
                autoFocus
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={joining || joinCode.trim().length < 8}
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Accesso in corso...
                </>
              ) : (
                "Accedi al Matrimonio"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setFlow("choice")}
              disabled={joining}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Indietro
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // ── Create flow (original 2-step) ──
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-accent">
              <Heart className="w-7 h-7 text-accent-foreground fill-accent-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold font-serif">
            {step === 1 ? "Chi si sposa?" : "Quando è il grande giorno?"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === 1
              ? "Dicci i nomi dei protagonisti e il tuo ruolo"
              : "Ci serve per creare la tua timeline personalizzata"}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {step} di 2</span>
            <span>{step === 1 ? "I Protagonisti" : "La Data"}</span>
          </div>
          <Progress value={step * 50} className="h-2" />
        </div>

        {/* Step 1: Names + Role */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="partner1">Nome Partner 1</Label>
              <Input
                id="partner1"
                value={partner1Name}
                onChange={(e) => setPartner1Name(e.target.value)}
                placeholder="Es. Marco"
                maxLength={100}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner2">Nome Partner 2</Label>
              <Input
                id="partner2"
                value={partner2Name}
                onChange={(e) => setPartner2Name(e.target.value)}
                placeholder="Es. Giulia"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Qual è il tuo ruolo?</Label>
              <Select value={userRole} onValueChange={setUserRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona il tuo ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sposa">Sposa</SelectItem>
                  <SelectItem value="sposo">Sposo</SelectItem>
                  <SelectItem value="wedding_planner">Wedding Planner</SelectItem>
                  <SelectItem value="altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-12"
                onClick={() => setFlow("choice")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                className="flex-1 h-12 text-base"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
              >
                Avanti
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Date */}
        {step === 2 && (
          <div className="space-y-5">
            {!isTentativeDate && (
              <div className="space-y-2">
                <Label htmlFor="date">Data del Matrimonio</Label>
                <Input
                  id="date"
                  type="date"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  autoFocus
                />
              </div>
            )}

            <div className="flex items-start space-x-3 py-2">
              <Checkbox
                id="tentative"
                checked={isTentativeDate}
                onCheckedChange={(checked) => setIsTentativeDate(checked as boolean)}
              />
              <div>
                <Label htmlFor="tentative" className="cursor-pointer select-none text-sm font-medium">
                  Non abbiamo ancora una data precisa
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Potrai modificarla in seguito nelle impostazioni
                </p>
              </div>
            </div>

            {isTentativeDate && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mese indicativo</Label>
                  <Select value={tentativeMonth} onValueChange={setTentativeMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mese" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Anno</Label>
                  <Select value={tentativeYear} onValueChange={setTentativeYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Anno" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Indietro
              </Button>
              <Button
                className="flex-1 h-12 text-base"
                disabled={!canProceedStep2 || loading}
                onClick={handleSubmit}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creazione...
                  </>
                ) : (
                  <>
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Entra nella Dashboard
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Onboarding;
