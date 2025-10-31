import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, MessageSquare, Send, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Section {
  section_type: string;
  original_text: string;
  user_notes?: string;
  line_start: number;
  line_end: number;
  confidence: number;
  enabled?: boolean;
}

interface ContractAnalysis {
  selected_sections?: Section[];
}

interface ContractWidgetsProps {
  contractId: string;
  analysis: ContractAnalysis;
  filePath: string;
  onRemove?: () => void;
}

export const ContractWidgets = ({
  contractId,
  analysis,
  filePath,
  onRemove,
}: ContractWidgetsProps) => {
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const { toast } = useToast();

  const sections = analysis.selected_sections || [];
  const hasSections = sections.length > 0;

  const SECTION_LABELS: Record<string, string> = {
    VENDOR_INFO: "📋 Anagrafica Fornitore",
    PAYMENT_PLAN: "💰 Piano di Pagamento",
    CANCELLATION_PENALTIES: "⚠️ Penali Cancellazione",
    EXTRA_COSTS: "💸 Costi Extra",
    PLAN_B: "☔ Piano B",
    EXTRA_RESPONSIBILITIES: "📝 Responsabilità Extra",
    OTHER: "📄 Altre Informazioni",
  };

  const suggestedQuestions = [
    "Qual è la penale se cancello?",
    "L'IVA è inclusa?",
    "Cosa succede se piove?",
  ];

  const handleAskQuestion = async () => {
    if (!qaQuestion.trim()) return;

    setQaLoading(true);
    try {
      // This would call an edge function that queries the contract with the question
      // For now, we'll show a placeholder
      toast({
        title: "Funzionalità in arrivo",
        description: "Q&A sul contratto sarà disponibile a breve",
      });
      setQaAnswer("Questa funzionalità sarà disponibile a breve.");
    } catch (error) {
      console.error("Error asking question:", error);
      toast({
        title: "Errore",
        description: "Impossibile elaborare la domanda",
        variant: "destructive",
      });
    } finally {
      setQaLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Riepilogo AI del Contratto */}
      {hasSections && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Riepilogo AI del Contratto
            </CardTitle>
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {sections.map((section, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="text-sm font-medium">
                    {SECTION_LABELS[section.section_type] || section.section_type}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(section.confidence * 100)}%
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
                  {section.original_text}
                </div>
                {section.user_notes && (
                  <div className="border-l-2 border-primary pl-3 py-1 bg-muted/30">
                    <div className="text-xs font-medium text-primary mb-1">Note:</div>
                    <p className="text-xs text-muted-foreground">{section.user_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Chiedi al Contratto (Q&A) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chiedi al Contratto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Chiedi qualcosa sul contratto..."
                value={qaQuestion}
                onChange={(e) => setQaQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !qaLoading) {
                    handleAskQuestion();
                  }
                }}
              />
              <Button
                size="icon"
                onClick={handleAskQuestion}
                disabled={qaLoading || !qaQuestion.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setQaQuestion(q)}
                  className="text-xs"
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>

          {qaAnswer && (
            <div className="border-l-2 border-primary pl-4 py-2 bg-muted/30 rounded">
              <p className="text-sm">{qaAnswer}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};