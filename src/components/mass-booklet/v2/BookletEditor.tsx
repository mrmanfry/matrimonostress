import { Church, ListChecks, BookOpen, Music, Palette } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import BookletStepSetup from "../BookletStepSetup";
import BookletStepRite from "../BookletStepRite";
import BookletStepReadings from "../BookletStepReadings";
import BookletStepCustom from "../BookletStepCustom";
import BookletStepStyle from "../BookletStepStyle";
import type { MassBookletContent } from "@/lib/massBookletSchema";

interface Props {
  content: MassBookletContent;
  onChange: (patch: Partial<MassBookletContent>) => void;
  openSection: string;
  onOpenChange: (id: string) => void;
  completion: Record<string, boolean>;
}

const SECTIONS = [
  { id: "setup", label: "Setup", icon: Church, hint: "Chiesa, celebrante, ruoli" },
  { id: "rito", label: "Rito", icon: ListChecks, hint: "Tipo di celebrazione" },
  { id: "letture", label: "Letture", icon: BookOpen, hint: "Lettura, salmo, vangelo" },
  { id: "personalizzazioni", label: "Personalizzazioni", icon: Music, hint: "Canti, preghiere, ringraziamenti" },
  { id: "stile", label: "Stile", icon: Palette, hint: "Font, colori, copertina" },
] as const;

/**
 * Editor pane (left side of the split layout).
 * Wraps the existing BookletStep* components in an accordion so the user can
 * edit any section without losing context of the live preview on the right.
 */
export default function BookletEditor({
  content,
  onChange,
  openSection,
  onOpenChange,
  completion,
}: Props) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
      {/* Section heading */}
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--paper-ink-3))] mb-2">
          Editor libretto
        </div>
        <h1 className="font-fraunces text-3xl font-medium text-[hsl(var(--paper-ink))] leading-tight">
          Costruisci il tuo libretto
        </h1>
        <p className="mt-2 text-sm text-[hsl(var(--paper-ink-2))]">
          Modifica una sezione alla volta. L'anteprima a destra si aggiorna automaticamente.
        </p>
      </div>

      <Accordion
        type="single"
        collapsible
        value={openSection}
        onValueChange={(v) => onOpenChange(v || "setup")}
        className="space-y-3"
      >
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const done = completion[s.id];
          return (
            <AccordionItem
              key={s.id}
              value={s.id}
              className="rounded-xl border border-[hsl(var(--paper-border))] bg-[hsl(var(--paper-surface))] shadow-sm overflow-hidden data-[state=open]:shadow-md transition-shadow"
            >
              <AccordionTrigger className="hover:no-underline py-4 px-5 [&>svg]:text-[hsl(var(--paper-ink-3))]">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${
                      done
                        ? "bg-[hsl(var(--paper-success-tint))] text-[hsl(var(--paper-success))]"
                        : "bg-[hsl(var(--paper-surface-muted))] text-[hsl(var(--paper-ink-2))]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm text-[hsl(var(--paper-ink))]">
                      {s.label}
                      {done && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-[hsl(var(--paper-success))] font-jetbrains-mono">
                          ✓ ok
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[hsl(var(--paper-ink-3))] mt-0.5">{s.hint}</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-2 border-t border-[hsl(var(--paper-border))]">
                {s.id === "setup" && <BookletStepSetup content={content} onChange={onChange} />}
                {s.id === "rito" && <BookletStepRite content={content} onChange={onChange} />}
                {s.id === "letture" && (
                  <BookletStepReadings content={content} onChange={onChange} />
                )}
                {s.id === "personalizzazioni" && (
                  <BookletStepCustom content={content} onChange={onChange} />
                )}
                {s.id === "stile" && <BookletStepStyle content={content} onChange={onChange} />}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
