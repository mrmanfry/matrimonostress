import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, MessageSquare, Send, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContractAnalysis {
  pagamenti: any[];
  punti_chiave: {
    penali_cancellazione?: string;
    costi_occulti?: string;
    piano_b?: string;
    responsabilita_extra?: string;
  };
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

  const keyPoints = analysis.punti_chiave || {};
  const hasKeyPoints = Object.values(keyPoints).some((v) => v);

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
      {hasKeyPoints && (
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
            {keyPoints.penali_cancellazione && (
              <div>
                <div className="text-sm font-medium text-destructive mb-1">
                  ⚠️ Penali Cancellazione
                </div>
                <p className="text-sm text-muted-foreground">
                  {keyPoints.penali_cancellazione}
                </p>
              </div>
            )}

            {keyPoints.costi_occulti && (
              <div>
                <div className="text-sm font-medium text-amber-600 mb-1">
                  💰 Costi Extra
                </div>
                <p className="text-sm text-muted-foreground">
                  {keyPoints.costi_occulti}
                </p>
              </div>
            )}

            {keyPoints.piano_b && (
              <div>
                <div className="text-sm font-medium text-blue-600 mb-1">
                  ☔ Piano B
                </div>
                <p className="text-sm text-muted-foreground">
                  {keyPoints.piano_b}
                </p>
              </div>
            )}

            {keyPoints.responsabilita_extra && (
              <div>
                <div className="text-sm font-medium text-purple-600 mb-1">
                  📋 Responsabilità Extra
                </div>
                <p className="text-sm text-muted-foreground">
                  {keyPoints.responsabilita_extra}
                </p>
              </div>
            )}
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