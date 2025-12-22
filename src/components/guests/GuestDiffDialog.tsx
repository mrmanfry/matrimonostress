import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserPlus, HelpCircle, UserMinus, RefreshCw, Check, X, AlertTriangle } from "lucide-react";

interface ParsedGuest {
  nome_proposto: string;
  adulti_stimati: number;
  bambini_stimati: number;
  gruppo_proposto?: string;
  note?: string;
}

interface ExistingGuest {
  id: string;
  first_name: string;
  last_name: string;
  adults_count: number | null;
  children_count: number | null;
  party_id: string | null;
  phone: string | null;
}

interface DiffMatch {
  parsed: ParsedGuest;
  existing: ExistingGuest;
  confidence: number;
}

interface DiffResult {
  exact_matches: DiffMatch[];
  fuzzy_matches: DiffMatch[];
  new_entries: ParsedGuest[];
  missing_in_new: ExistingGuest[];
}

interface GuestDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
  onSuccess: () => void;
}

export function GuestDiffDialog({ open, onOpenChange, weddingId, onSuccess }: GuestDiffDialogProps) {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [rawText, setRawText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  
  // User decisions
  const [selectedNewEntries, setSelectedNewEntries] = useState<Set<number>>(new Set());
  const [fuzzyDecisions, setFuzzyDecisions] = useState<Map<number, 'same' | 'different'>>(new Map());
  const [selectedRemovals, setSelectedRemovals] = useState<Set<string>>(new Set());

  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      toast.error("Incolla prima il testo della lista");
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('[GuestDiff] Starting analysis for wedding:', weddingId);
      const { data, error } = await supabase.functions.invoke('analyze-guest-diff', {
        body: { text: rawText, weddingId }
      });

      console.log('[GuestDiff] Response received:', { data, error });

      if (error) {
        console.error('[GuestDiff] Supabase error:', error);
        throw error;
      }
      if (data?.error) {
        console.error('[GuestDiff] Data error:', data.error);
        throw new Error(data.error);
      }

      // Validate response structure
      if (!data || !Array.isArray(data.new_entries) || !Array.isArray(data.fuzzy_matches)) {
        console.error('[GuestDiff] Invalid response structure:', data);
        throw new Error('Risposta non valida dal server');
      }

      console.log('[GuestDiff] Setting diff result:', {
        new_entries: data.new_entries.length,
        fuzzy_matches: data.fuzzy_matches.length,
        exact_matches: data.exact_matches?.length || 0,
        missing_in_new: data.missing_in_new?.length || 0
      });

      setDiffResult(data);
      
      // Initialize selections
      const newSet = new Set<number>();
      data.new_entries.forEach((_: ParsedGuest, idx: number) => newSet.add(idx));
      setSelectedNewEntries(newSet);
      setFuzzyDecisions(new Map());
      setSelectedRemovals(new Set());
      
      console.log('[GuestDiff] Transitioning to review step');
      setStep('review');
      toast.success(`Analisi completata: ${data.new_entries.length} nuovi, ${data.fuzzy_matches.length} da verificare`);
    } catch (error: any) {
      console.error('[GuestDiff] Error analyzing diff:', error);
      toast.error(error.message || "Errore nell'analisi della lista");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!diffResult) return;

    setIsApplying(true);
    try {
      // 1. Add new guests
      const newGuests = diffResult.new_entries
        .filter((_, idx) => selectedNewEntries.has(idx))
        .map(g => ({
          wedding_id: weddingId,
          first_name: g.nome_proposto.split(' ')[0] || g.nome_proposto,
          last_name: g.nome_proposto.split(' ').slice(1).join(' ') || '',
          adults_count: g.adulti_stimati,
          children_count: g.bambini_stimati,
          notes: g.note || null,
          is_child: false
        }));

      // Add fuzzy matches marked as "different" (they become new guests)
      diffResult.fuzzy_matches.forEach((match, idx) => {
        if (fuzzyDecisions.get(idx) === 'different') {
          newGuests.push({
            wedding_id: weddingId,
            first_name: match.parsed.nome_proposto.split(' ')[0] || match.parsed.nome_proposto,
            last_name: match.parsed.nome_proposto.split(' ').slice(1).join(' ') || '',
            adults_count: match.parsed.adulti_stimati,
            children_count: match.parsed.bambini_stimati,
            notes: match.parsed.note || null,
            is_child: false
          });
        }
      });

      if (newGuests.length > 0) {
        const { error: insertError } = await supabase
          .from('guests')
          .insert(newGuests);
        if (insertError) throw insertError;
      }

      // 2. Delete removed guests
      const idsToRemove = Array.from(selectedRemovals);
      if (idsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('guests')
          .delete()
          .in('id', idsToRemove);
        if (deleteError) throw deleteError;
      }

      const summary = [];
      if (newGuests.length > 0) summary.push(`${newGuests.length} aggiunti`);
      if (idsToRemove.length > 0) summary.push(`${idsToRemove.length} rimossi`);
      
      toast.success(summary.length > 0 ? `Modifiche applicate: ${summary.join(', ')}` : 'Nessuna modifica applicata');
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error applying changes:', error);
      toast.error(error.message || "Errore nell'applicazione delle modifiche");
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setRawText('');
    setDiffResult(null);
    setSelectedNewEntries(new Set());
    setFuzzyDecisions(new Map());
    setSelectedRemovals(new Set());
    onOpenChange(false);
  };

  const toggleNewEntry = (idx: number) => {
    const newSet = new Set(selectedNewEntries);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedNewEntries(newSet);
  };

  const setFuzzyDecision = (idx: number, decision: 'same' | 'different') => {
    const newMap = new Map(fuzzyDecisions);
    newMap.set(idx, decision);
    setFuzzyDecisions(newMap);
  };

  const toggleRemoval = (id: string) => {
    const newSet = new Set(selectedRemovals);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRemovals(newSet);
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  };

  // Calculate summary
  const pendingFuzzy = diffResult?.fuzzy_matches.filter((_, idx) => !fuzzyDecisions.has(idx)).length || 0;
  const toAdd = selectedNewEntries.size + Array.from(fuzzyDecisions.values()).filter(d => d === 'different').length;
  const toRemove = selectedRemovals.size;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Verifica Modifiche da Lista Esterna
          </DialogTitle>
          <DialogDescription>
            {step === 'input' 
              ? "Incolla la tua lista aggiornata per confrontarla con gli invitati esistenti"
              : "Rivedi le differenze trovate e conferma le modifiche"
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            <Textarea
              placeholder={`Incolla qui la tua lista aggiornata...

Esempi:
Mario Rossi (2)
Famiglia Bianchi (4+2)
Zio Beppe
Anna e Marco`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Annulla
              </Button>
              <Button onClick={handleAnalyze} disabled={isAnalyzing || !rawText.trim()}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisi in corso...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verifica Modifiche
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && diffResult && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg text-sm">
              <span className="text-muted-foreground">Riepilogo:</span>
              <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                <UserPlus className="w-3 h-3 mr-1" />
                {diffResult.new_entries.length} nuovi
              </Badge>
              <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950">
                <HelpCircle className="w-3 h-3 mr-1" />
                {diffResult.fuzzy_matches.length} da verificare
              </Badge>
              <Badge variant="outline" className="bg-red-50 dark:bg-red-950">
                <UserMinus className="w-3 h-3 mr-1" />
                {diffResult.missing_in_new.length} assenti
              </Badge>
            </div>

            <Accordion type="multiple" defaultValue={['new', 'fuzzy', 'missing']} className="w-full">
              {/* New Entries Section */}
              {diffResult.new_entries.length > 0 && (
                <AccordionItem value="new">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-green-600" />
                      <span>Nuovi Invitati Trovati ({diffResult.new_entries.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {diffResult.new_entries.map((entry, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selectedNewEntries.has(idx)}
                            onCheckedChange={() => toggleNewEntry(idx)}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{entry.nome_proposto}</p>
                            <p className="text-sm text-muted-foreground">
                              {entry.adulti_stimati} adulti, {entry.bambini_stimati} bambini
                              {entry.gruppo_proposto && ` • ${entry.gruppo_proposto}`}
                              {entry.note && ` • ${entry.note}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Fuzzy Matches Section */}
              {diffResult.fuzzy_matches.length > 0 && (
                <AccordionItem value="fuzzy">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-yellow-600" />
                      <span>Possibili Duplicati ({diffResult.fuzzy_matches.length})</span>
                      {pendingFuzzy > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {pendingFuzzy} da decidere
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {diffResult.fuzzy_matches.map((match, idx) => (
                        <Card key={idx} className={`overflow-hidden ${fuzzyDecisions.has(idx) ? 'opacity-75' : ''}`}>
                          <CardContent className="p-4">
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">📝 Dal testo</p>
                                <p className="font-medium">{match.parsed.nome_proposto}</p>
                                <p className="text-sm text-muted-foreground">
                                  {match.parsed.adulti_stimati} adulti, {match.parsed.bambini_stimati} bambini
                                </p>
                              </div>
                              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">📁 Nel database</p>
                                <p className="font-medium">{match.existing.first_name} {match.existing.last_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {match.existing.adults_count || 1} adulti, {match.existing.children_count || 0} bambini
                                  {match.existing.phone && ` • ${match.existing.phone}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <Badge className={getConfidenceBadgeColor(match.confidence)}>
                                🎯 Match: {match.confidence}%
                              </Badge>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={fuzzyDecisions.get(idx) === 'same' ? 'default' : 'outline'}
                                  onClick={() => setFuzzyDecision(idx, 'same')}
                                  className="gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Stessa persona
                                </Button>
                                <Button
                                  size="sm"
                                  variant={fuzzyDecisions.get(idx) === 'different' ? 'destructive' : 'outline'}
                                  onClick={() => setFuzzyDecision(idx, 'different')}
                                  className="gap-1"
                                >
                                  <X className="w-3 h-3" />
                                  Diversi
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Missing in New Section */}
              {diffResult.missing_in_new.length > 0 && (
                <AccordionItem value="missing">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <UserMinus className="w-4 h-4 text-red-600" />
                      <span>Non Presenti nel Nuovo Testo ({diffResult.missing_in_new.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-3 mb-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                      <p className="text-sm text-destructive">
                        Questi invitati sono nel database ma non nel testo incollato. 
                        Seleziona solo quelli da <strong>rimuovere definitivamente</strong>.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {diffResult.missing_in_new.map((guest) => (
                        <div 
                          key={guest.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 ${
                            selectedRemovals.has(guest.id) ? 'border-destructive bg-destructive/5' : ''
                          }`}
                        >
                          <Checkbox
                            checked={selectedRemovals.has(guest.id)}
                            onCheckedChange={() => toggleRemoval(guest.id)}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{guest.first_name} {guest.last_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {guest.adults_count || 1} adulti, {guest.children_count || 0} bambini
                              {guest.phone && ` • 📱 ${guest.phone}`}
                            </p>
                          </div>
                          {selectedRemovals.has(guest.id) && (
                            <Badge variant="destructive">Da rimuovere</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {/* Action bar */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {toAdd > 0 && <span className="text-green-600 mr-3">+{toAdd} aggiunti</span>}
                {toRemove > 0 && <span className="text-red-600">-{toRemove} rimossi</span>}
                {toAdd === 0 && toRemove === 0 && <span>Nessuna modifica selezionata</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('input')}>
                  ← Indietro
                </Button>
                <Button 
                  onClick={handleApplyChanges} 
                  disabled={isApplying || (toAdd === 0 && toRemove === 0)}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applicando...
                    </>
                  ) : (
                    'Applica Modifiche'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
