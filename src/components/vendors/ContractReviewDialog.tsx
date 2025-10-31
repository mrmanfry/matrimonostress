import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Section {
  type: string;
  start_line: number;
  end_line: number;
  confidence: number;
  enabled?: boolean;
  user_notes?: string;
}

interface ContractReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: {
    full_text: string[];
    sections: Section[];
  };
  fileInfo: {
    fileName: string;
    filePath: string;
    fileType: string;
  };
  vendorId: string;
  weddingId: string;
  onSaveComplete: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  vendor_info: "Anagrafica Fornitore",
  payment_plan: "Piano di Pagamento",
  cancellation: "Cancellazione e Penali",
  extra_costs: "Costi Extra",
  force_majeure: "Forza Maggiore / Piano B",
  client_responsibilities: "Responsabilità Cliente",
};

const SECTION_COLORS: Record<string, string> = {
  vendor_info: "bg-blue-100 dark:bg-blue-900/30",
  payment_plan: "bg-green-100 dark:bg-green-900/30",
  cancellation: "bg-red-100 dark:bg-red-900/30",
  extra_costs: "bg-orange-100 dark:bg-orange-900/30",
  force_majeure: "bg-purple-100 dark:bg-purple-900/30",
  client_responsibilities: "bg-pink-100 dark:bg-pink-900/30",
};

export const ContractReviewDialog = ({
  open,
  onOpenChange,
  analysis,
  fileInfo,
  vendorId,
  weddingId,
  onSaveComplete,
}: ContractReviewDialogProps) => {
  const [sections, setSections] = useState<Section[]>(
    analysis.sections.map((s) => ({ ...s, enabled: true, user_notes: "" }))
  );
  const [saving, setSaving] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleSection = (index: number) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const updateSectionNotes = (index: number, notes: string) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, user_notes: notes } : s))
    );
  };

  const getLineHighlight = (lineIndex: number): string | null => {
    for (const section of sections) {
      if (!section.enabled) continue;
      if (lineIndex >= section.start_line - 1 && lineIndex <= section.end_line - 1) {
        return SECTION_COLORS[section.type] || "bg-yellow-100";
      }
    }
    return null;
  };

  const getSectionText = (section: Section): string => {
    return analysis.full_text
      .slice(section.start_line - 1, section.end_line)
      .join('\n');
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const selectedSections = sections
        .filter((s) => s.enabled)
        .map((s) => ({
          type: s.type,
          lines: { start: s.start_line, end: s.end_line },
          original_text: getSectionText(s),
          user_notes: s.user_notes || "",
          confidence: s.confidence,
        }));

      const { error: contractError } = await supabase
        .from("vendor_contracts")
        .insert([{
          vendor_id: vendorId,
          wedding_id: weddingId,
          file_path: fileInfo.filePath,
          file_name: fileInfo.fileName,
          file_type: fileInfo.fileType,
          ai_analysis: {
            full_text: analysis.full_text,
            selected_sections: selectedSections,
          },
        }]);

      if (contractError) throw contractError;

      toast({
        title: "Contratto salvato",
        description: `${selectedSections.length} sezioni selezionate e salvate con successo.`,
      });

      onSaveComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving contract:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante il salvataggio",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Rivedi il contratto analizzato - {fileInfo.fileName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Left column: OCR Text Viewer (60%) */}
          <div className="col-span-3 flex flex-col min-h-0 space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Testo estratto (OCR) - {analysis.full_text.length} righe
            </div>
            <ScrollArea className="flex-1 border rounded-lg p-4 bg-background">
              <div className="space-y-1 font-mono text-sm">
                {analysis.full_text.map((line, index) => {
                  const highlight = getLineHighlight(index);
                  return (
                    <div
                      key={index}
                      className={`flex gap-3 py-1 px-2 rounded ${highlight || ""}`}
                    >
                      <span className="text-muted-foreground min-w-[3rem] text-right">
                        {index + 1}
                      </span>
                      <span className="flex-1">{line || " "}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right column: Sections Review (40%) */}
          <div className="col-span-2 flex flex-col min-h-0 space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              Sezioni identificate ({sections.length})
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-3 pr-4">
                {sections.map((section, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 space-y-3 ${
                      !section.enabled ? "opacity-50" : ""
                    } ${highlightedSection === section.type ? "ring-2 ring-primary" : ""}`}
                    onMouseEnter={() => setHighlightedSection(section.type)}
                    onMouseLeave={() => setHighlightedSection(null)}
                  >
                    {/* Section Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Checkbox
                          checked={section.enabled}
                          onCheckedChange={() => toggleSection(index)}
                        />
                        <div>
                          <div className="font-semibold text-sm">
                            {SECTION_LABELS[section.type] || section.type}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Righe {section.start_line}-{section.end_line} • 
                            Confidence: {(section.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded ${SECTION_COLORS[section.type] || "bg-gray-200"}`}
                      />
                    </div>

                    {section.enabled && (
                      <>
                        {/* Original Text */}
                        <div className="space-y-2">
                          <Label className="text-xs">Testo Originale</Label>
                          <Textarea
                            value={getSectionText(section)}
                            readOnly
                            rows={4}
                            className="text-xs font-mono resize-none bg-muted/50"
                          />
                        </div>

                        {/* User Notes */}
                        <div className="space-y-2">
                          <Label className="text-xs">Note (opzionale)</Label>
                          <Textarea
                            value={section.user_notes}
                            onChange={(e) => updateSectionNotes(index, e.target.value)}
                            placeholder="Aggiungi note su questa sezione..."
                            rows={2}
                            className="text-xs resize-none"
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {sections.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Nessuna sezione identificata dall'AI
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving || sections.filter(s => s.enabled).length === 0}>
            {saving ? "Salvataggio..." : `Salva ${sections.filter(s => s.enabled).length} Sezioni`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
