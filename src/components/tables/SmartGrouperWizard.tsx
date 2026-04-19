import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Shield,
  Scale,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  Crown,
  CircleDot,
  RectangleHorizontal,
  Calculator,
  Target,
  CheckCircle,
  Lock,
  AlertTriangle,
  Trophy,
  TrendingUp,
  Plus,
  UserMinus,
  Scissors,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isDeclined, isConfirmed } from "@/lib/rsvpHelpers";
import { calculateExpectedCounts } from "@/lib/expectedCalculator";
import { getEffectiveStatus } from "@/lib/nucleusStatusHelper";

// ============================================================
// TYPES
// ============================================================

type VibeMode = "CLAN" | "BALANCED" | "MIXER";
type CalculationMode = "planned" | "expected" | "confirmed";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  party_id?: string | null;
  group_id?: string | null;
  category?: string | null;
  rsvp_status?: string | null;
  is_child: boolean;
  is_staff?: boolean;
  is_couple_member?: boolean;
  save_the_date_sent_at: string | null;
  std_response: string | null;
  phone?: string | null;
  allow_plus_one?: boolean;
  plus_one_name?: string | null;
}

interface Assignment {
  tableId: string;
  guestIds: string[];
}

interface UnassignedSuggestion {
  type: "CREATE_TABLE" | "REMOVE_CONFLICT" | "MOVE_GUEST" | "ALLOW_SPLIT";
  label: string;
  payload: Record<string, unknown>;
}

interface UnassignedCluster {
  clusterId: string;
  reason: "CONFLICT" | "NO_CAPACITY" | "SPLIT_REQUIRED";
  guestIds: string[];
  suggestions: UnassignedSuggestion[];
}

interface CreatedTable {
  id: string;
  name: string;
  capacity: number;
  table_type: string;
}

interface QualityScore {
  score: number;
  label: string;
  breakdown: {
    assignment_rate: number;
    conflicts_remaining: number;
    avg_fill_rate: number;
    balanced_tables: number;
    split_families: number;
  };
}

interface WeddingTargets {
  target_adults: number;
  target_children: number;
  target_staff: number;
}

interface SmartGrouperWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: Guest[];
  weddingId: string | null;
  onComplete: () => void;
  weddingTargets?: WeddingTargets | null;
  vendorStaffTotal?: number;
}

// ============================================================
// CONSTANTS — testi rassicuranti per il target "senza stress"
// ============================================================

const PHASE_MESSAGES: Record<string, string> = {
  seeding: "Sto organizzando i gruppi principali...",
  filling: "Sto posizionando gli ospiti rimanenti...",
  optimizing: "Sto ottimizzando la disposizione finale...",
  finalizing: "Quasi fatto, ultimi ritocchi...",
};

const VIBE_OPTIONS: {
  mode: VibeMode;
  icon: React.ReactNode;
  title: string;
  description: string;
  hint: string;
}[] = [
  {
    mode: "CLAN",
    icon: <Shield className="w-8 h-8" />,
    title: "Clan Mode",
    description: "Famiglie unite, categorie separate",
    hint: "Ideale per matrimoni tradizionali con parentele numerose",
  },
  {
    mode: "BALANCED",
    icon: <Scale className="w-8 h-8" />,
    title: "Balanced",
    description: "Il giusto mix di familiari e nuove conoscenze",
    hint: "La scelta più versatile, va bene nel 70% dei casi",
  },
  {
    mode: "MIXER",
    icon: <Sparkles className="w-8 h-8" />,
    title: "Mixer Mode",
    description: "Mischia categorie, favorisci nuove amicizie",
    hint: "Perfetto per matrimoni giovani con tante single",
  },
];

const CALCULATION_MODE_OPTIONS: {
  mode: CalculationMode;
  icon: React.ReactNode;
  title: string;
  description: string;
}[] = [
  {
    mode: "planned",
    icon: <Target className="w-6 h-6" />,
    title: "Pianificati",
    description: "Target con buffer per eventuali imprevisti",
  },
  {
    mode: "expected",
    icon: <Users className="w-6 h-6" />,
    title: "Previsti",
    description: "Tutti tranne chi ha declinato",
  },
  {
    mode: "confirmed",
    icon: <CheckCircle className="w-6 h-6" />,
    title: "Confermati",
    description: "Solo chi ha confermato (blocca la disposizione)",
  },
];

// ============================================================
// COMPONENT
// ============================================================

export const SmartGrouperWizard = ({
  open,
  onOpenChange,
  guests,
  weddingId,
  onComplete,
  weddingTargets,
  vendorStaffTotal = 0,
}: SmartGrouperWizardProps) => {
  // Step 1: Table Configuration
  const [includeImperial, setIncludeImperial] = useState(true);
  const [imperialCapacity, setImperialCapacity] = useState(12);
  const [standardShape, setStandardShape] = useState<"ROUND" | "RECTANGULAR">("ROUND");
  const [capacityRange, setCapacityRange] = useState<[number, number]>([8, 10]);

  // Step 2: Vibe Mode
  const [vibeMode, setVibeMode] = useState<VibeMode>("BALANCED");

  // Step 3: Logistics
  const [calculationMode, setCalculationMode] = useState<CalculationMode>("expected");
  const [allowSplitFamilies, setAllowSplitFamilies] = useState(false);
  const [preserveLockedTables, setPreserveLockedTables] = useState(true);

  // Flow state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<
    "seeding" | "filling" | "optimizing" | "finalizing"
  >("seeding");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [result, setResult] = useState<{
    assignments: Assignment[];
    unassigned: UnassignedCluster[];
    created_tables: CreatedTable[];
    quality: QualityScore;
    sa_improvement_pct: number;
    locked_tables_preserved: number;
  } | null>(null);
  const [applyingSuggestion, setApplyingSuggestion] = useState<string | null>(null);

  const { toast } = useToast();

  // ============================================================
  // Computed guest counts (stesse logiche v1, canonicalizzate)
  // ============================================================

  const guestCounts = useMemo(() => {
    const invitableGuests = guests.filter((g) => !g.is_couple_member && !g.is_staff);
    const expectedResult = calculateExpectedCounts(invitableGuests, guests, vendorStaffTotal);
    const confirmedGuests = guests.filter((g) => isConfirmed(g.rsvp_status));
    const plannedTotal = weddingTargets
      ? (weddingTargets.target_adults || 0) +
        (weddingTargets.target_children || 0) +
        (weddingTargets.target_staff || 0)
      : expectedResult.totalHeadCount;

    return {
      planned: plannedTotal,
      expected: expectedResult.totalHeadCount,
      confirmed: confirmedGuests.length,
    };
  }, [guests, weddingTargets, vendorStaffTotal]);

  const filteredGuests = useMemo(() => {
    switch (calculationMode) {
      case "confirmed":
        return guests.filter((g) => isConfirmed(g.rsvp_status));
      case "expected": {
        const invitableGuests = guests.filter((g) => !g.is_couple_member && !g.is_staff);
        const anyStdSent = invitableGuests.some((g) => {
          const status = getEffectiveStatus(g, guests);
          return status.hasStdSent;
        });
        if (!anyStdSent) {
          return guests.filter((g) => !isDeclined(g.rsvp_status));
        }
        return guests.filter((g) => {
          if (g.is_couple_member || g.is_staff) return !isDeclined(g.rsvp_status);
          const status = getEffectiveStatus(g, guests);
          if (!status.hasStdSent) return true;
          return g.std_response !== "likely_no";
        });
      }
      case "planned":
      default:
        return guests.filter((g) => !isDeclined(g.rsvp_status));
    }
  }, [guests, calculationMode]);

  const estimationGuestCount = guestCounts[calculationMode];

  const estimatedTables = useMemo(() => {
    const imperialGuests = includeImperial ? imperialCapacity : 0;
    const remainingGuests = Math.max(0, estimationGuestCount - imperialGuests);
    const avgCapacity = (capacityRange[0] + capacityRange[1]) / 2;
    const standardTables = Math.ceil(remainingGuests / (avgCapacity * 0.9));
    return {
      imperial: includeImperial ? 1 : 0,
      standard: standardTables,
      total: (includeImperial ? 1 : 0) + standardTables,
    };
  }, [estimationGuestCount, includeImperial, imperialCapacity, capacityRange]);

  // ============================================================
  // ALGORITHM RUN + simulated progress
  // ============================================================

  const runProgressSimulation = () => {
    // Simula progress visibile all'utente (il server non streamma)
    // Durata totale stimata: ~3-8s per matrimonio medio
    const phases: {
      phase: "seeding" | "filling" | "optimizing" | "finalizing";
      duration: number;
      targetProgress: number;
    }[] = [
      { phase: "seeding", duration: 800, targetProgress: 25 },
      { phase: "filling", duration: 1200, targetProgress: 55 },
      { phase: "optimizing", duration: 3000, targetProgress: 90 },
      { phase: "finalizing", duration: 500, targetProgress: 98 },
    ];

    let startTime = Date.now();
    let totalElapsed = 0;
    const cumulativeDurations = phases.reduce<number[]>((acc, p, i) => {
      acc.push((acc[i - 1] || 0) + p.duration);
      return acc;
    }, []);

    const interval = setInterval(() => {
      totalElapsed = Date.now() - startTime;
      let currentPhaseIdx = 0;
      for (let i = 0; i < cumulativeDurations.length; i++) {
        if (totalElapsed < cumulativeDurations[i]) {
          currentPhaseIdx = i;
          break;
        }
        currentPhaseIdx = i;
      }

      const currentPhase = phases[Math.min(currentPhaseIdx, phases.length - 1)];
      setLoadingPhase(currentPhase.phase);

      // Progress interpolato linearmente nella fase corrente
      const phaseStart = cumulativeDurations[currentPhaseIdx - 1] || 0;
      const phaseDuration = currentPhase.duration;
      const phaseProgress = Math.min(1, (totalElapsed - phaseStart) / phaseDuration);
      const prevTarget = phases[currentPhaseIdx - 1]?.targetProgress || 0;
      const newProgress = prevTarget + (currentPhase.targetProgress - prevTarget) * phaseProgress;

      setLoadingProgress(Math.round(newProgress));
    }, 100);

    return interval;
  };

  const handleRunAlgorithm = async () => {
    if (!weddingId) return;

    setLoading(true);
    setLoadingProgress(0);
    setLoadingPhase("seeding");

    const progressInterval = runProgressSimulation();

    try {
      const payload = {
        mode: calculationMode === "confirmed" ? "LOGISTICS" : "PLANNING",
        calculation_mode: calculationMode,
        target_guest_count: estimationGuestCount,
        vibe_mode: vibeMode,
        preserve_locked_tables: preserveLockedTables,
        guests: filteredGuests.map((g) => ({
          id: g.id,
          first_name: g.first_name,
          last_name: g.last_name,
          party_id: g.party_id,
          group_id: g.group_id,
          category: g.category,
          rsvp_status: g.rsvp_status,
          is_child: g.is_child,
        })),
        table_config: {
          include_imperial: includeImperial,
          imperial_capacity: imperialCapacity,
          standard_shape: standardShape,
          capacity_range: { min: capacityRange[0], max: capacityRange[1] },
          preferred_fill_rate: 0.9,
        },
        config: {
          allow_split_families: allowSplitFamilies,
          min_fill_rate: 0.8,
          party_categories: ["FRIENDS", "AMICI", "GIOVANI"],
        },
        weddingId,
      };

      const { data, error } = await supabase.functions.invoke("smart-table-assigner", {
        body: payload,
      });

      if (error) throw error;

      clearInterval(progressInterval);
      setLoadingProgress(100);

      // Piccolo delay per permettere all'utente di vedere il 100%
      await new Promise((r) => setTimeout(r, 300));

      setResult(data);
      setStep(4);

      const totalAssigned = data.assignments.reduce(
        (sum: number, a: Assignment) => sum + a.guestIds.length,
        0,
      );

      toast({
        title: `Disposizione ${data.quality?.label?.toLowerCase() || "pronta"}!`,
        description: `${data.created_tables?.length || 0} tavoli · ${totalAssigned} ospiti seduti${
          data.sa_improvement_pct > 5
            ? ` · ottimizzata del ${Math.round(data.sa_improvement_pct)}%`
            : ""
        }`,
      });
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Smart Table Planner error:", error);
      toast({
        title: "Qualcosa è andato storto",
        description: "Ci riproviamo? Se persiste, contattaci: siamo qui per aiutarti.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SUGGESTION HANDLERS
  // ============================================================

  const handleApplySuggestion = async (
    unassigned: UnassignedCluster,
    suggestion: UnassignedSuggestion,
  ) => {
    if (!weddingId) return;
    const suggestionKey = `${unassigned.clusterId}-${suggestion.type}`;
    setApplyingSuggestion(suggestionKey);

    try {
      switch (suggestion.type) {
        case "CREATE_TABLE": {
          const capacity = suggestion.payload.capacity as number;
          const guestIds = suggestion.payload.assign_guest_ids as string[];

          // 1. Crea il tavolo
          const maxPosY = Math.max(
            ...(result?.created_tables.map(() => 250) || [250]),
            400,
          );
          const { data: newTable, error: tableError } = await supabase
            .from("tables")
            .insert({
              wedding_id: weddingId,
              name: `Tavolo ${(result?.created_tables.length || 0) + 1}`,
              capacity,
              shape: standardShape,
              table_type: "standard",
              position_x: 100,
              position_y: maxPosY + 200,
              is_locked: false,
            })
            .select()
            .single();

          if (tableError) throw tableError;

          // 2. Assegna gli ospiti
          const assignmentInserts = guestIds.map((gid) => ({
            table_id: newTable.id,
            guest_id: gid,
          }));
          const { error: assignError } = await supabase
            .from("table_assignments")
            .insert(assignmentInserts);

          if (assignError) throw assignError;

          // 3. Aggiorna lo stato locale
          setResult((prev) =>
            prev
              ? {
                  ...prev,
                  created_tables: [...prev.created_tables, newTable as CreatedTable],
                  assignments: [...prev.assignments, { tableId: newTable.id, guestIds }],
                  unassigned: prev.unassigned.filter(
                    (u) => u.clusterId !== unassigned.clusterId,
                  ),
                }
              : null,
          );

          toast({
            title: "Tavolo creato!",
            description: `${guestIds.length} ospiti assegnati al nuovo tavolo.`,
          });
          break;
        }

        case "REMOVE_CONFLICT": {
          const g1 = suggestion.payload.guest_id_1 as string;
          const g2 = suggestion.payload.guest_id_2 as string;

          const { error } = await supabase
            .from("guest_conflicts")
            .delete()
            .eq("wedding_id", weddingId)
            .or(
              `and(guest_id_1.eq.${g1},guest_id_2.eq.${g2}),and(guest_id_1.eq.${g2},guest_id_2.eq.${g1})`,
            );

          if (error) throw error;

          toast({
            title: "Conflitto rimosso",
            description: "Rilancia l'algoritmo per vedere la nuova disposizione.",
          });

          // Rimuovi il cluster dai non assegnati visivamente
          setResult((prev) =>
            prev
              ? {
                  ...prev,
                  unassigned: prev.unassigned.filter(
                    (u) => u.clusterId !== unassigned.clusterId,
                  ),
                }
              : null,
          );
          break;
        }

        case "ALLOW_SPLIT": {
          // Riprovo l'algoritmo con allow_split_families=true
          setAllowSplitFamilies(true);
          toast({
            title: "Modalità split attivata",
            description: "Rilancio l'algoritmo permettendo di dividere i gruppi.",
          });
          // Non richiamo automaticamente per evitare re-render infiniti
          // L'utente deve cliccare "Riconfigura"
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error("Error applying suggestion:", error);
      toast({
        title: "Errore",
        description: "Non siamo riusciti ad applicare il suggerimento. Riprova.",
        variant: "destructive",
      });
    } finally {
      setApplyingSuggestion(null);
    }
  };

  // ============================================================
  // UX HELPERS
  // ============================================================

  const handleApply = () => {
    onComplete();
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setResult(null);
    setLoadingProgress(0);
    onOpenChange(false);
  };

  const getGuestName = (guestId: string) => {
    const guest = guests.find((g) => g.id === guestId);
    return guest ? `${guest.first_name} ${guest.last_name}` : guestId;
  };

  const getQualityColor = (score: number) => {
    if (score >= 85) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-blue-600 dark:text-blue-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getQualityIcon = (score: number) => {
    if (score >= 85) return <Trophy className="w-6 h-6" />;
    if (score >= 70) return <CheckCircle className="w-6 h-6" />;
    return <AlertTriangle className="w-6 h-6" />;
  };

  const getSuggestionIcon = (type: UnassignedSuggestion["type"]) => {
    switch (type) {
      case "CREATE_TABLE":
        return <Plus className="w-4 h-4" />;
      case "REMOVE_CONFLICT":
        return <UserMinus className="w-4 h-4" />;
      case "ALLOW_SPLIT":
        return <Scissors className="w-4 h-4" />;
      default:
        return <ArrowRight className="w-4 h-4" />;
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Smart Table Planner
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Prima di tutto: come vuoi organizzare i tavoli?"}
            {step === 2 && "Scegli l'atmosfera della serata"}
            {step === 3 && "Ultimi dettagli e poi lasci fare a noi"}
            {step === 4 && "Ecco la tua disposizione"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step
                  ? "bg-primary text-primary-foreground"
                  : s < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
          ))}
        </div>

        {/* ==================== STEP 1 ==================== */}
        {step === 1 && (
          <div className="space-y-6">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <div>
                    <Label className="text-base font-medium">Tavolo Imperiale</Label>
                    <p className="text-sm text-muted-foreground">
                      Sposi, testimoni e famiglie più strette
                    </p>
                  </div>
                </div>
                <Switch checked={includeImperial} onCheckedChange={setIncludeImperial} />
              </div>

              {includeImperial && (
                <div className="flex items-center gap-4 pl-8">
                  <Label>Capacità:</Label>
                  <Input
                    type="number"
                    value={imperialCapacity}
                    onChange={(e) => setImperialCapacity(Number(e.target.value))}
                    className="w-20"
                    min={6}
                    max={20}
                  />
                  <span className="text-muted-foreground">persone</span>
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-base font-medium">Tavoli Ospiti</Label>
                  <p className="text-sm text-muted-foreground">
                    Configurazione dei tavoli standard
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Forma tavoli</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={standardShape === "ROUND" ? "default" : "outline"}
                    onClick={() => setStandardShape("ROUND")}
                    className="flex-1 gap-2"
                  >
                    <CircleDot className="w-4 h-4" />
                    Tondi
                  </Button>
                  <Button
                    type="button"
                    variant={standardShape === "RECTANGULAR" ? "default" : "outline"}
                    onClick={() => setStandardShape("RECTANGULAR")}
                    className="flex-1 gap-2"
                  >
                    <RectangleHorizontal className="w-4 h-4" />
                    Rettangolari
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Posti per tavolo</Label>
                  <Badge variant="secondary" className="font-mono">
                    {capacityRange[0]} - {capacityRange[1]}
                  </Badge>
                </div>
                <Slider
                  value={capacityRange}
                  onValueChange={(value) => setCapacityRange(value as [number, number])}
                  min={6}
                  max={14}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Troveremo la capacità ottimale in questo range
                </p>
              </div>
            </Card>

            <Card className="p-4 bg-accent/10 border-accent/50">
              <div className="flex items-center gap-3">
                <Calculator className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-medium">Stima preliminare</p>
                  <p className="text-sm text-muted-foreground">
                    Con <strong>{estimationGuestCount}</strong> ospiti ti servono circa{" "}
                    <strong>{estimatedTables.total} tavoli</strong>
                    {estimatedTables.imperial > 0 && (
                      <> (1 imperiale + {estimatedTables.standard} standard)</>
                    )}
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>
                Avanti
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ==================== STEP 2 ==================== */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {VIBE_OPTIONS.map((option) => (
                <Card
                  key={option.mode}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    vibeMode === option.mode
                      ? "ring-2 ring-primary border-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setVibeMode(option.mode)}
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div
                      className={`${
                        vibeMode === option.mode ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {option.icon}
                    </div>
                    <h3 className="font-semibold">{option.title}</h3>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                    {vibeMode === option.mode && (
                      <p className="text-xs italic text-primary mt-2">💡 {option.hint}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Indietro
              </Button>
              <Button onClick={() => setStep(3)}>
                Avanti
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ==================== STEP 3 ==================== */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Calculation Mode */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Quali ospiti consideriamo?
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {CALCULATION_MODE_OPTIONS.map((option) => (
                  <Card
                    key={option.mode}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      calculationMode === option.mode
                        ? "ring-2 ring-primary border-primary"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setCalculationMode(option.mode)}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div
                        className={`${
                          calculationMode === option.mode
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {option.icon}
                      </div>
                      <h4 className="font-medium text-sm">{option.title}</h4>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                      <Badge variant="secondary" className="font-mono">
                        {guestCounts[option.mode]} ospiti
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Preserve locked tables */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5 flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-base">Mantieni tavoli bloccati</Label>
                  <p className="text-sm text-muted-foreground">
                    I tavoli che hai già bloccato manualmente verranno preservati
                  </p>
                </div>
              </div>
              <Switch
                checked={preserveLockedTables}
                onCheckedChange={setPreserveLockedTables}
              />
            </div>

            {/* Allow split families */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Permetti divisione famiglie</Label>
                <p className="text-sm text-muted-foreground">
                  Usalo solo se spazi ristretti obbligano a separare nuclei
                </p>
              </div>
              <Switch checked={allowSplitFamilies} onCheckedChange={setAllowSplitFamilies} />
            </div>

            {/* Config summary */}
            <div className="p-4 bg-accent/10 rounded-lg">
              <h4 className="font-medium mb-2">Riepilogo</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Tavoli stimati:</span>{" "}
                  <Badge variant="secondary">{estimatedTables.total}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Vibe:</span>{" "}
                  <Badge variant="secondary">{vibeMode}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Ospiti ({CALCULATION_MODE_OPTIONS.find((o) => o.mode === calculationMode)?.title}
                    ):
                  </span>{" "}
                  <Badge variant="secondary">{estimationGuestCount}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Forma:</span>{" "}
                  <Badge variant="secondary">
                    {standardShape === "ROUND" ? "Tondi" : "Rettangolari"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Indietro
              </Button>
              <Button onClick={handleRunAlgorithm} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Genera disposizione
                  </>
                )}
              </Button>
            </div>

            {/* Progress panel (visibile durante il loading) */}
            {loading && (
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{PHASE_MESSAGES[loadingPhase]}</p>
                  <span className="text-sm text-muted-foreground">{loadingProgress}%</span>
                </div>
                <Progress value={loadingProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Rilassati, ci stiamo pensando noi ✨
                </p>
              </Card>
            )}
          </div>
        )}

        {/* ==================== STEP 4 ==================== */}
        {step === 4 && result && (
          <div className="space-y-4">
            {/* Quality Hero */}
            <Card className="p-5 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={getQualityColor(result.quality.score)}>
                    {getQualityIcon(result.quality.score)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Qualità disposizione</p>
                    <p className="text-2xl font-bold">
                      {result.quality.label}{" "}
                      <span
                        className={`text-lg font-mono ${getQualityColor(result.quality.score)}`}
                      >
                        {result.quality.score}/100
                      </span>
                    </p>
                  </div>
                </div>
                {result.sa_improvement_pct > 5 && (
                  <div className="text-right">
                    <Badge variant="outline" className="gap-1">
                      <TrendingUp className="w-3 h-3" />+
                      {Math.round(result.sa_improvement_pct)}% ottimizzato
                    </Badge>
                  </div>
                )}
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Seduti</p>
                  <p className="font-semibold">{result.quality.breakdown.assignment_rate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Conflitti</p>
                  <p
                    className={`font-semibold ${
                      result.quality.breakdown.conflicts_remaining > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {result.quality.breakdown.conflicts_remaining}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Tavoli pieni</p>
                  <p className="font-semibold">
                    {result.quality.breakdown.balanced_tables}/{result.created_tables.length}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Famiglie spezzate</p>
                  <p
                    className={`font-semibold ${
                      result.quality.breakdown.split_families > 0
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}
                  >
                    {result.quality.breakdown.split_families}
                  </p>
                </div>
              </div>

              {result.locked_tables_preserved > 0 && (
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {result.locked_tables_preserved} tavoli bloccati preservati
                </p>
              )}
            </Card>

            {/* Stats compatte */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {result.created_tables?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Tavoli</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {result.assignments.reduce((sum, a) => sum + a.guestIds.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Seduti</p>
              </Card>
              <Card className="p-3 text-center">
                <p
                  className={`text-2xl font-bold ${
                    result.unassigned.length > 0 ? "text-amber-600" : "text-muted-foreground"
                  }`}
                >
                  {result.unassigned.reduce((sum, u) => sum + u.guestIds.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Da sistemare</p>
              </Card>
            </div>

            {/* Created Tables Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tavoli creati</Label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {result.created_tables?.map((table) => {
                  const assignment = result.assignments.find((a) => a.tableId === table.id);
                  return (
                    <Card key={table.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {table.table_type === "imperial" ? (
                            <Crown className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Users className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{table.name}</span>
                        </div>
                        <Badge variant="secondary">
                          {assignment?.guestIds.length || 0}/{table.capacity}
                        </Badge>
                      </div>
                      {assignment && assignment.guestIds.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {assignment.guestIds
                            .slice(0, 3)
                            .map((id) => getGuestName(id))
                            .join(", ")}
                          {assignment.guestIds.length > 3 &&
                            ` +${assignment.guestIds.length - 3} altri`}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Unassigned con azioni concrete */}
            {result.unassigned.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  Ospiti da sistemare ({result.unassigned.length}{" "}
                  {result.unassigned.length === 1 ? "situazione" : "situazioni"})
                </Label>
                <div className="space-y-3">
                  {result.unassigned.map((u) => (
                    <Card
                      key={u.clusterId}
                      className="p-4 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">
                          {u.reason === "CONFLICT" ? "🔴" : "🟡"}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {u.reason === "CONFLICT"
                              ? "Conflitto rilevato"
                              : "Manca spazio sufficiente"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {u.guestIds
                              .slice(0, 3)
                              .map((id) => getGuestName(id))
                              .join(", ")}
                            {u.guestIds.length > 3 && ` +${u.guestIds.length - 3} altri`}
                          </p>
                        </div>
                      </div>

                      {/* Actionable suggestions */}
                      <div className="mt-3 space-y-2 pl-11">
                        {u.suggestions.map((suggestion, idx) => {
                          const key = `${u.clusterId}-${suggestion.type}`;
                          const isLoadingThis = applyingSuggestion === key;
                          return (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start gap-2 h-auto py-2 text-left"
                              onClick={() => handleApplySuggestion(u, suggestion)}
                              disabled={isLoadingThis || applyingSuggestion !== null}
                            >
                              {isLoadingThis ? (
                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                              ) : (
                                <span className="shrink-0">
                                  {getSuggestionIcon(suggestion.type)}
                                </span>
                              )}
                              <span className="text-xs">{suggestion.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Riconfigura
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Scarta
                </Button>
                <Button onClick={handleApply} className="bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" />
                  Conferma
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
