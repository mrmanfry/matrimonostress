import { AlertTriangle, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { validateBookletCompleteness, type MassBookletContent } from "@/lib/massBookletSchema";

interface Props {
  content: MassBookletContent;
  onGoToStep: (step: number) => void;
}

export default function BookletStepPreview({ content, onGoToStep }: Props) {
  const [accepted, setAccepted] = useState(false);
  const validation = validateBookletCompleteness(content);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold mb-1">Anteprima & Export</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Controlla che tutte le informazioni siano complete prima di generare il PDF.
        </p>
      </div>

      {/* Validation */}
      {!validation.isComplete && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Campi obbligatori mancanti
          </div>
          {validation.missing.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onGoToStep(m.step)}
              className="flex items-center gap-2 text-sm text-destructive hover:underline"
            >
              <ArrowRight className="w-3 h-3" />
              <span>Step {m.step}: {m.label}</span>
            </button>
          ))}
        </div>
      )}

      {validation.isComplete && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-primary font-medium">
          ✓ Tutti i campi obbligatori sono compilati. Il libretto è pronto per la generazione.
        </div>
      )}

      {/* Preview Placeholder */}
      <div className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          L'anteprima PDF sarà disponibile nello Sprint 3
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Il motore di rendering @react-pdf verrà integrato nel prossimo sprint.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="disclaimer"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="disclaimer" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
            Ho riletto attentamente i testi, controllato i nomi e mi impegno a stampare una <strong>copia di prova</strong> prima
            di procedere con la stampa definitiva.
          </Label>
        </div>
      </div>

      <Button
        disabled={!validation.isComplete || !accepted}
        className="w-full gap-2"
        size="lg"
      >
        <FileText className="w-4 h-4" />
        Genera PDF (disponibile nello Sprint 3)
      </Button>
    </div>
  );
}
