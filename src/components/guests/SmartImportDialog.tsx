import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";

interface ParsedGuest {
  nome_proposto: string;
  adulti_stimati: number;
  bambini_stimati: number;
  gruppo_proposto?: string;
  note?: string;
  testo_originale: string;
  ignored?: boolean;
}

interface SmartImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
  onSuccess: () => void;
  groups: Array<{ id: string; name: string }>;
}

export const SmartImportDialog = ({
  open,
  onOpenChange,
  weddingId,
  onSuccess,
  groups,
}: SmartImportDialogProps) => {
  const [step, setStep] = useState<"input" | "review">("input");
  const [rawText, setRawText] = useState("");
  const [parsedGuests, setParsedGuests] = useState<ParsedGuest[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci del testo da analizzare",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-guest-text", {
        body: { text: rawText },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Errore nell'analisi",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (!data.guests || data.guests.length === 0) {
        toast({
          title: "Nessun invitato trovato",
          description: "Prova a formattare il testo in modo più chiaro",
          variant: "destructive",
        });
        return;
      }

      setParsedGuests(data.guests.map((g: ParsedGuest) => ({ ...g, ignored: false })));
      setStep("review");
    } catch (error: any) {
      console.error("Error analyzing text:", error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'analisi",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = async () => {
    const guestsToImport = parsedGuests.filter((g) => !g.ignored);
    
    if (guestsToImport.length === 0) {
      toast({
        title: "Nessun invitato selezionato",
        description: "Seleziona almeno un invitato da importare",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      // Create groups if needed
      const groupsToCreate = new Set<string>();
      guestsToImport.forEach((guest) => {
        if (guest.gruppo_proposto && !groups.find((g) => g.name === guest.gruppo_proposto)) {
          groupsToCreate.add(guest.gruppo_proposto);
        }
      });

      const createdGroups: { [key: string]: string } = {};
      for (const groupName of groupsToCreate) {
        const { data: newGroup, error } = await supabase
          .from("guest_groups")
          .insert({ wedding_id: weddingId, name: groupName })
          .select()
          .single();

        if (error) throw error;
        createdGroups[groupName] = newGroup.id;
      }

      // Import guests
      const guestsData = guestsToImport.map((guest) => {
        let groupId = null;
        if (guest.gruppo_proposto) {
          groupId =
            createdGroups[guest.gruppo_proposto] ||
            groups.find((g) => g.name === guest.gruppo_proposto)?.id;
        }

        // Split name into first and last name
        const nameParts = guest.nome_proposto.trim().split(" ");
        const firstName = nameParts[0] || guest.nome_proposto;
        const lastName = nameParts.slice(1).join(" ") || "";

        return {
          wedding_id: weddingId,
          first_name: firstName,
          last_name: lastName,
          adults_count: guest.adulti_stimati,
          children_count: guest.bambini_stimati,
          group_id: groupId,
          notes: guest.note || null,
          rsvp_status: "pending",
        };
      });

      const { error } = await supabase.from("guests").insert(guestsData);

      if (error) throw error;

      toast({
        title: "Successo!",
        description: `${guestsData.length} ${guestsData.length === 1 ? 'invitato importato' : 'invitati importati'} con successo`,
      });

      // Reset and close
      setRawText("");
      setParsedGuests([]);
      setStep("input");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error importing guests:", error);
      toast({
        title: "Errore durante l'importazione",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const updateGuest = (index: number, field: keyof ParsedGuest, value: any) => {
    setParsedGuests((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    );
  };

  const handleClose = () => {
    setRawText("");
    setParsedGuests([]);
    setStep("input");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Importa Invitati da Testo Grezzo
          </DialogTitle>
          <DialogDescription>
            {step === "input"
              ? "Incolla qui la tua lista di invitati. L'AI proverà a capirla per te."
              : "Revisiona e correggi i dati estratti prima dell'importazione"}
          </DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Esempi:</strong> "Zia Maria e Zio Franco (2)", "Famiglia Rossi (2+1)",
                "Marco (single)", "Colleghi Sposa (8)"
              </p>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Incolla qui la tua lista di invitati..."
                className="min-h-[300px] font-mono"
                maxLength={10000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {rawText.length}/10,000 caratteri
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Annulla
              </Button>
              <Button onClick={handleAnalyze} disabled={isAnalyzing || !rawText.trim()}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisi AI in corso...
                  </>
                ) : (
                  "Analizza Lista"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Testo Originale</th>
                      <th className="p-2 text-left">Nome Invitato</th>
                      <th className="p-2 text-center">Adulti</th>
                      <th className="p-2 text-center">Bambini</th>
                      <th className="p-2 text-left">Gruppo</th>
                      <th className="p-2 text-left">Note</th>
                      <th className="p-2 text-center">Ignora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedGuests.map((guest, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2 text-xs text-muted-foreground max-w-[150px] truncate">
                          {guest.testo_originale}
                        </td>
                        <td className="p-2">
                          <Input
                            value={guest.nome_proposto}
                            onChange={(e) => updateGuest(index, "nome_proposto", e.target.value)}
                            className="h-8"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={guest.adulti_stimati}
                            onChange={(e) =>
                              updateGuest(index, "adulti_stimati", parseInt(e.target.value) || 0)
                            }
                            className="h-8 w-16 text-center"
                            min="0"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={guest.bambini_stimati}
                            onChange={(e) =>
                              updateGuest(index, "bambini_stimati", parseInt(e.target.value) || 0)
                            }
                            className="h-8 w-16 text-center"
                            min="0"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={guest.gruppo_proposto || ""}
                            onChange={(e) => updateGuest(index, "gruppo_proposto", e.target.value)}
                            className="h-8"
                            placeholder="Opzionale"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={guest.note || ""}
                            onChange={(e) => updateGuest(index, "note", e.target.value)}
                            className="h-8"
                            placeholder="Note..."
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Checkbox
                            checked={guest.ignored}
                            onCheckedChange={(checked) =>
                              updateGuest(index, "ignored", checked)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setStep("input")}>
                ← Torna indietro
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Annulla
                </Button>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importazione...
                    </>
                  ) : (
                    `Importa ${parsedGuests.filter((g) => !g.ignored).length} Invitati Approvati`
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
