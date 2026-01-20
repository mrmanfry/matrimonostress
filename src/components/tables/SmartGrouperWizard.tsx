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
import { Loader2, Shield, Scale, Sparkles, ArrowRight, ArrowLeft, Check, Users, Crown, CircleDot, RectangleHorizontal, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type VibeMode = 'CLAN' | 'BALANCED' | 'MIXER';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  party_id?: string | null;
  group_id?: string | null;
  category?: string | null;
  rsvp_status?: string | null;
}

interface Assignment {
  tableId: string;
  guestIds: string[];
}

interface UnassignedCluster {
  clusterId: string;
  reason: string;
  guestIds: string[];
}

interface CreatedTable {
  id: string;
  name: string;
  capacity: number;
  table_type: string;
}

interface SmartGrouperWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: Guest[];
  weddingId: string | null;
  onComplete: () => void;
}

const LOADING_MESSAGES = [
  "Calcolando il numero ottimale di tavoli...",
  "Creando la disposizione perfetta...",
  "Negoziando con la zia Maria...",
  "Calcolando la distanza di sicurezza tra ex...",
  "Ottimizzando la distribuzione dei bambini...",
  "Bilanciando i tavoli per categoria...",
  "Evitando discussioni politiche...",
  "Posizionando strategicamente i single...",
];

const VIBE_OPTIONS: { mode: VibeMode; icon: React.ReactNode; title: string; description: string }[] = [
  {
    mode: 'CLAN',
    icon: <Shield className="w-8 h-8" />,
    title: "Clan Mode",
    description: "Rispetta le tradizioni. Famiglie insieme, categorie separate.",
  },
  {
    mode: 'BALANCED',
    icon: <Scale className="w-8 h-8" />,
    title: "Balanced",
    description: "Il giusto mix. Qualche nuova conoscenza, ma sicura.",
  },
  {
    mode: 'MIXER',
    icon: <Sparkles className="w-8 h-8" />,
    title: "Mixer Mode",
    description: "Party hard! Mischia i giovani, crea nuove amicizie.",
  },
];

export const SmartGrouperWizard = ({
  open,
  onOpenChange,
  guests,
  weddingId,
  onComplete,
}: SmartGrouperWizardProps) => {
  // Step 1: Table Configuration
  const [includeImperial, setIncludeImperial] = useState(true);
  const [imperialCapacity, setImperialCapacity] = useState(12);
  const [standardShape, setStandardShape] = useState<'ROUND' | 'RECTANGULAR'>('ROUND');
  const [capacityRange, setCapacityRange] = useState<[number, number]>([8, 10]);

  // Step 2: Vibe Mode
  const [vibeMode, setVibeMode] = useState<VibeMode>('BALANCED');

  // Step 3: Logistics
  const [onlyConfirmed, setOnlyConfirmed] = useState(true);
  const [allowSplitFamilies, setAllowSplitFamilies] = useState(false);

  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [result, setResult] = useState<{ 
    assignments: Assignment[]; 
    unassigned: UnassignedCluster[];
    created_tables: CreatedTable[];
  } | null>(null);
  const { toast } = useToast();

  const filteredGuests = useMemo(() => {
    return onlyConfirmed 
      ? guests.filter(g => g.rsvp_status?.toLowerCase() === 'confirmed' || g.rsvp_status === 'Confermato')
      : guests;
  }, [guests, onlyConfirmed]);

  const estimatedTables = useMemo(() => {
    const guestCount = filteredGuests.length;
    const imperialGuests = includeImperial ? imperialCapacity : 0;
    const remainingGuests = Math.max(0, guestCount - imperialGuests);
    const avgCapacity = (capacityRange[0] + capacityRange[1]) / 2;
    const standardTables = Math.ceil(remainingGuests / (avgCapacity * 0.9));
    return {
      imperial: includeImperial ? 1 : 0,
      standard: standardTables,
      total: (includeImperial ? 1 : 0) + standardTables,
    };
  }, [filteredGuests.length, includeImperial, imperialCapacity, capacityRange]);

  const handleRunAlgorithm = async () => {
    if (!weddingId) return;

    setLoading(true);
    let messageIndex = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);

    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[messageIndex]);
    }, 2000);

    try {
      const payload = {
        mode: onlyConfirmed ? 'LOGISTICS' : 'PLANNING',
        vibe_mode: vibeMode,
        guests: filteredGuests.map(g => ({
          id: g.id,
          first_name: g.first_name,
          last_name: g.last_name,
          party_id: g.party_id,
          group_id: g.group_id,
          category: g.category,
          rsvp_status: g.rsvp_status,
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
          party_categories: ['FRIENDS', 'AMICI', 'GIOVANI'],
        },
        weddingId,
      };

      const { data, error } = await supabase.functions.invoke('smart-table-assigner', {
        body: payload,
      });

      if (error) throw error;

      setResult(data);
      setStep(4);

      const totalAssigned = data.assignments.reduce(
        (sum: number, a: Assignment) => sum + a.guestIds.length,
        0
      );
      
      toast({
        title: "Algoritmo completato!",
        description: `Creati ${data.created_tables?.length || 0} tavoli con ${totalAssigned} ospiti assegnati.`,
      });
    } catch (error) {
      console.error("Smart Table Planner error:", error);
      toast({
        title: "Errore",
        description: "L'algoritmo ha avuto un problema. Riprova.",
        variant: "destructive",
      });
    } finally {
      clearInterval(messageInterval);
      setLoading(false);
    }
  };

  const handleApply = () => {
    onComplete();
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setResult(null);
    onOpenChange(false);
  };

  const getGuestName = (guestId: string) => {
    const guest = guests.find(g => g.id === guestId);
    return guest ? `${guest.first_name} ${guest.last_name}` : guestId;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Smart Table Planner
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Configura la struttura dei tavoli"}
            {step === 2 && "Scegli lo stile di disposizione"}
            {step === 3 && "Configura le opzioni avanzate"}
            {step === 4 && "Anteprima della disposizione generata"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
          ))}
        </div>

        {/* Step 1: Table Configuration */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Imperial Table */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <div>
                    <Label className="text-base font-medium">Tavolo Imperiale</Label>
                    <p className="text-sm text-muted-foreground">
                      Sposi, testimoni e genitori
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

            {/* Standard Tables */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-base font-medium">Tavoli Ospiti</Label>
                  <p className="text-sm text-muted-foreground">
                    Configurazione tavoli standard
                  </p>
                </div>
              </div>

              {/* Shape Selection */}
              <div className="space-y-2">
                <Label>Forma tavoli</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={standardShape === 'ROUND' ? 'default' : 'outline'}
                    onClick={() => setStandardShape('ROUND')}
                    className="flex-1 gap-2"
                  >
                    <CircleDot className="w-4 h-4" />
                    Tondi
                  </Button>
                  <Button
                    type="button"
                    variant={standardShape === 'RECTANGULAR' ? 'default' : 'outline'}
                    onClick={() => setStandardShape('RECTANGULAR')}
                    className="flex-1 gap-2"
                  >
                    <RectangleHorizontal className="w-4 h-4" />
                    Rettangolari
                  </Button>
                </div>
              </div>

              {/* Capacity Range */}
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
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  L'algoritmo sceglierà la capacità ottimale in questo range
                </p>
              </div>
            </Card>

            {/* Estimate */}
            <Card className="p-4 bg-accent/10 border-accent/50">
              <div className="flex items-center gap-3">
                <Calculator className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-medium">Stima preliminare</p>
                  <p className="text-sm text-muted-foreground">
                    Con <strong>{filteredGuests.length}</strong> ospiti servono circa{" "}
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

        {/* Step 2: Vibe Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {VIBE_OPTIONS.map(option => (
                <Card
                  key={option.mode}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    vibeMode === option.mode
                      ? 'ring-2 ring-primary border-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setVibeMode(option.mode)}
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className={`${vibeMode === option.mode ? 'text-primary' : 'text-muted-foreground'}`}>
                      {option.icon}
                    </div>
                    <h3 className="font-semibold">{option.title}</h3>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
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

        {/* Step 3: Logistics Config */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Solo ospiti confermati</Label>
                  <p className="text-sm text-muted-foreground">
                    Usa solo chi ha confermato la presenza
                  </p>
                </div>
                <Switch checked={onlyConfirmed} onCheckedChange={setOnlyConfirmed} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Permetti divisione famiglie</Label>
                  <p className="text-sm text-muted-foreground">
                    Consenti di separare nuclei familiari se necessario
                  </p>
                </div>
                <Switch checked={allowSplitFamilies} onCheckedChange={setAllowSplitFamilies} />
              </div>
            </div>

            <div className="p-4 bg-accent/10 rounded-lg">
              <h4 className="font-medium mb-2">Riepilogo Configurazione</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Tavoli stimati:</span>{" "}
                  <Badge variant="secondary">{estimatedTables.total}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Modalità:</span>{" "}
                  <Badge variant="secondary">{vibeMode}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Ospiti:</span>{" "}
                  <Badge variant="secondary">{filteredGuests.length}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Forma:</span>{" "}
                  <Badge variant="secondary">{standardShape === 'ROUND' ? 'Tondi' : 'Rettangolari'}</Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
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
                    Genera Tavoli e Disposizione
                  </>
                )}
              </Button>
            </div>

            {loading && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground animate-pulse">{loadingMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Preview Results */}
        {step === 4 && result && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{result.created_tables?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Tavoli creati</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {result.assignments.reduce((sum, a) => sum + a.guestIds.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Ospiti seduti</p>
              </Card>
              <Card className="p-3 text-center">
                <p className={`text-2xl font-bold ${result.unassigned.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {result.unassigned.reduce((sum, u) => sum + u.guestIds.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Non assegnati</p>
              </Card>
            </div>

            {/* Created Tables Preview */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {result.created_tables?.map((table) => {
                const assignment = result.assignments.find(a => a.tableId === table.id);
                return (
                  <Card key={table.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {table.table_type === 'imperial' ? (
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
                        {assignment.guestIds.slice(0, 3).map(id => getGuestName(id)).join(", ")}
                        {assignment.guestIds.length > 3 && ` +${assignment.guestIds.length - 3} altri`}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Unassigned Warning */}
            {result.unassigned.length > 0 && (
              <Card className="p-3 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">
                  ⚠️ Ospiti non assegnati
                </h4>
                <div className="space-y-1">
                  {result.unassigned.map(u => (
                    <div key={u.clusterId} className="text-sm">
                      <span className="text-muted-foreground">
                        {u.reason === 'CONFLICT' ? '🔴 Conflitto:' : '🟡 Capacità:'}
                      </span>{" "}
                      {u.guestIds.map(id => getGuestName(id)).join(", ")}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Riconfigura
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Scarta Tutto
                </Button>
                <Button onClick={handleApply} className="bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" />
                  Completa
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
