import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PercorsoStep = {
  label: string;
  done: boolean;
  current?: boolean;
};

interface Props {
  steps: PercorsoStep[];
}

/**
 * 5-step "Percorso" stepper used in the detail panel.
 * Paper-styled, vertical list with hairline rules between rows.
 */
export function PercorsoStepper({ steps }: Props) {
  return (
    <div>
      {steps.map((step, idx) => (
        <div
          key={idx}
          className={cn(
            "flex items-center gap-2.5 py-2.5",
            idx < steps.length - 1 && "border-b border-paper-border/60"
          )}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border",
              step.done && "bg-emerald-100/70 border-emerald-200 text-emerald-700",
              !step.done && step.current && "bg-paper-brand/15 border-paper-brand/40 text-paper-brand",
              !step.done && !step.current && "bg-paper-surface-muted border-paper-border text-paper-ink-3"
            )}
          >
            {step.done ? (
              <Check className="w-2.5 h-2.5" strokeWidth={3} />
            ) : step.current ? (
              <span className="w-1.5 h-1.5 rounded-full bg-paper-brand" />
            ) : null}
          </div>
          <div
            className={cn(
              "flex-1 text-[13px]",
              (step.done || step.current) ? "text-paper-ink" : "text-paper-ink-3",
              step.current && "font-medium"
            )}
          >
            {step.label}
          </div>
        </div>
      ))}
    </div>
  );
}
