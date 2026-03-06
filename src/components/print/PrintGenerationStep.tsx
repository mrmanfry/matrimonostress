import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface PrintGenerationStepProps {
  progress: number;
  currentName: string;
  currentIndex: number;
  total: number;
  isSuccess: boolean;
  onClose: () => void;
}

const PrintGenerationStep = ({
  progress,
  currentName,
  currentIndex,
  total,
  isSuccess,
  onClose,
}: PrintGenerationStepProps) => {
  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-6 max-w-md">
          <div className="mx-auto w-20 h-20 rounded-full bg-[hsl(var(--status-confirmed))]/10 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-[hsl(var(--status-confirmed))]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Inviti Pronti! 🎉</h2>
            <p className="text-muted-foreground mt-2">
              Il file PDF è stato salvato sul tuo computer. Ora puoi stamparlo o portarlo in tipografia.
            </p>
          </div>
          <Button onClick={onClose} size="lg">
            Chiudi e torna alle campagne
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-md w-full">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Generazione in corso...</h2>
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-muted-foreground">
            Generazione invito: <strong>{currentName}</strong> ({currentIndex} di {total})
          </p>
        </div>
        <p className="text-xs text-muted-foreground/70">
          ⚠️ Non chiudere questa finestra. Stiamo generando gli inviti ad alta risoluzione.
        </p>
      </div>
    </div>
  );
};

export default PrintGenerationStep;
