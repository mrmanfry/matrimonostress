import { Check, Church, BookOpen, Music, Eye, ListChecks, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Setup", icon: Church },
  { label: "Rito", icon: ListChecks },
  { label: "Letture", icon: BookOpen },
  { label: "Personalizzazioni", icon: Music },
  { label: "Stile", icon: Palette },
  { label: "Anteprima", icon: Eye },
];

interface BookletStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  completedFields?: Record<number, boolean>;
}

export default function BookletStepper({ currentStep, onStepClick }: BookletStepperProps) {
  return (
    <nav className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isCurrent = stepNum === currentStep;
        const isPast = stepNum < currentStep;
        const Icon = step.icon;

        return (
          <button
            key={stepNum}
            type="button"
            onClick={() => onStepClick(stepNum)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
              isCurrent && "bg-primary text-primary-foreground shadow-soft",
              isPast && "bg-primary/10 text-primary hover:bg-primary/20",
              !isCurrent && !isPast && "text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px]">
              {isPast ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
