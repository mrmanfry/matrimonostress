import { useState } from "react";
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
import { Loader2, Shield, Scale, Sparkles, ArrowRight, ArrowLeft, Check, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type VibeMode = 'CLAN' | 'BALANCED' | 'MIXER';

interface Table {
  id: string;
  name: string;
  capacity: number;
  shape?: string;
  table_type?: string;
  is_locked?: boolean;
}

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  party_id: string | null;
  group_id: string | null;
  category: string | null;
  rsvp_status: string | null;
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

interface SmartGrouperWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: Table[];
  guests: Guest[];
  weddingId: string | null;
  onApplyAssignments: (assignments: Assignment[]) => void;
}

const LOADING_MESSAGES = [
  "Calcolando le affinità familiari...",
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
  tables,
  guests,
  weddingId,
  onApplyAssignments,
}: SmartGrouperWizardProps) => {
  const [step, setStep] = useState(1);
  const [vibeMode, setVibeMode] = useState<VibeMode>('BALANCED');
  const [onlyConfirmed, setOnlyConfirmed] = useState(true);
  const [allowSplitFamilies, setAllowSplitFamilies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [result, setResult] = useState<{ assignments: Assignment[]; unassigned: UnassignedCluster[] } | null>(null);
  const { toast } = useToast();

  const filteredGuests = onlyConfirmed 
    ? guests.filter(g => g.rsvp_status?.toLowerCase() === 'confirmed' || g.rsvp_status === 'Confermato')
    : guests;

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
        available_tables: tables.map(t => ({
          id: t.id,
          type: (t.shape?.toUpperCase() as 'ROUND' | 'RECTANGULAR') || 'ROUND',
          capacity: t.capacity,
          is_locked: t.is_locked || false,
          current_guests: [],
        })),
        guests: filteredGuests.map(g => ({
          id: g.id,
          first_name: g.first_name,
          last_name: g.last_name,
          party_id: g.party_id,
          group_id: g.group_id,
          category: g.category,
          rsvp_status: g.rsvp_status,
        })),
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
      setStep(3);

      const totalAssigned = data.assignments.reduce(
        (sum: number, a: Assignment) => sum + a.guestIds.length,
        0
      );
      
      toast({
        title: "Algoritmo completato!",
        description: `${totalAssigned} ospiti assegnati a ${data.assignments.length} tavoli.`,
      });
    } catch (error) {
      console.error("Smart Table Assigner error:", error);
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
    if (result) {
      onApplyAssignments(result.assignments);
      handleClose();
    }
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

  const getTableName = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    return table ? table.name : tableId;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Suggerisci Disposizione AI
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Scegli lo stile di disposizione che preferisci"}
            {step === 2 && "Configura le opzioni avanzate"}
            {step === 3 && "Anteprima della disposizione suggerita"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3].map(s => (
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

        {/* Step 1: Vibe Selection */}
        {step === 1 && (
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

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>
                Avanti
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Logistics Config */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Solo ospiti confermati</Label>
                  <p className="text-sm text-muted-foreground">
                    Usa solo chi ha confermato la presenza (Mode: LOGISTICS)
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
              <h4 className="font-medium mb-2">Riepilogo</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Modalità:</span>{" "}
                  <Badge variant="secondary">{vibeMode}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Tavoli:</span>{" "}
                  <Badge variant="secondary">{tables.length}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Ospiti:</span>{" "}
                  <Badge variant="secondary">{filteredGuests.length}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Posti totali:</span>{" "}
                  <Badge variant="secondary">{tables.reduce((sum, t) => sum + t.capacity, 0)}</Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
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
                    Genera Disposizione
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

        {/* Step 3: Preview Results */}
        {step === 3 && result && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{result.assignments.length}</p>
                <p className="text-xs text-muted-foreground">Tavoli assegnati</p>
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

            {/* Assignments Preview */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {result.assignments.slice(0, 5).map(assignment => (
                <Card key={assignment.tableId} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{getTableName(assignment.tableId)}</span>
                    </div>
                    <Badge variant="secondary">{assignment.guestIds.length} ospiti</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {assignment.guestIds.slice(0, 3).map(id => getGuestName(id)).join(", ")}
                    {assignment.guestIds.length > 3 && ` +${assignment.guestIds.length - 3} altri`}
                  </p>
                </Card>
              ))}
              {result.assignments.length > 5 && (
                <p className="text-sm text-center text-muted-foreground">
                  ...e altri {result.assignments.length - 5} tavoli
                </p>
              )}
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
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Modifica Opzioni
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Scarta
                </Button>
                <Button onClick={handleApply} className="bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" />
                  Accetta e Salva
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
