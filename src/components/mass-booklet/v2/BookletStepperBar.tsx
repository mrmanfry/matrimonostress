import { Check, Church, ListChecks, BookOpen, Music, Palette, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "setup", label: "Setup", icon: Church },
  { id: "rito", label: "Rito", icon: ListChecks },
  { id: "letture", label: "Letture", icon: BookOpen },
  { id: "personalizzazioni", label: "Personalizzazioni", icon: Music },
  { id: "stile", label: "Stile", icon: Palette },
  { id: "anteprima", label: "Anteprima", icon: Eye },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

interface Props {
  stepIdx: number;
  setStepIdx: (i: number) => void;
  completion: Record<string, boolean>;
}

/**
 * Horizontal stepper bar that sits below the topbar.
 * Mirrors the Libretto Messa design: numbered chip + label, brand pill on
 * the active step, success-tinted check on completed steps.
 */
export default function BookletStepperBar({ stepIdx, setStepIdx, completion }: Props) {
  return (
    <div className="flex items-center gap-0 px-6 py-3 bg-[hsl(var(--paper-surface))] border-b border-[hsl(var(--paper-border))] overflow-x-auto">
      {STEPS.map((s, i) => {
        const isActive = i === stepIdx;
        const isDone = i < stepIdx || !!completion[s.id];
        const clickable = i <= stepIdx + 1 || isDone;
        return (
          <div key={s.id} className="flex items-center flex-shrink-0">
            <button
              type="button"
              onClick={() => clickable && setStepIdx(i)}
              disabled={!clickable}
              className={cn(
                "inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors",
                isActive
                  ? "bg-[hsl(var(--paper-brand-tint))] text-[hsl(var(--paper-brand-ink))] border border-[hsl(var(--paper-brand))] font-medium"
                  : isDone
                    ? "text-[hsl(var(--paper-ink))] hover:bg-[hsl(var(--paper-surface-muted))]"
                    : "text-[hsl(var(--paper-ink-3))]",
                !clickable && "cursor-not-allowed opacity-60"
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] font-jetbrains-mono font-semibold",
                  isActive
                    ? "bg-[hsl(var(--paper-brand))] text-white"
                    : isDone
                      ? "bg-[hsl(var(--paper-success-tint))] text-[hsl(var(--paper-success))] border border-[hsl(var(--paper-success))]"
                      : "bg-[hsl(var(--paper-surface-muted))] text-[hsl(var(--paper-ink-3))]"
                )}
              >
                {isDone && !isActive ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className="hidden md:inline whitespace-nowrap">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-6 h-px mx-0.5 opacity-60",
                  i < stepIdx ? "bg-[hsl(var(--paper-brand))]" : "bg-[hsl(var(--paper-border))]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export { STEPS };
