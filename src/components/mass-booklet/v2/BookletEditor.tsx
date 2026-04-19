import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { useState } from "react";
import BookletStepSetup from "../BookletStepSetup";
import BookletStepRite from "../BookletStepRite";
import BookletStepReadings from "../BookletStepReadings";
import BookletStepCustom from "../BookletStepCustom";
import BookletStepStyle from "../BookletStepStyle";
import BookletStepPreview from "../BookletStepPreview";
import BookletStepHeader from "./BookletStepHeader";
import ReadingsLibraryDrawer, { type ReadingSlot } from "./ReadingsLibraryDrawer";
import liturgiaData from "@/data/liturgia.json";
import { STEPS } from "./BookletStepperBar";
import type { MassBookletContent } from "@/lib/massBookletSchema";

interface Props {
  content: MassBookletContent;
  onChange: (patch: Partial<MassBookletContent>) => void;
  stepIdx: number;
  setStepIdx: (i: number) => void;
  partner1: string;
  partner2: string;
}

const STEP_HEADERS = {
  setup: {
    eyebrow: "Setup",
    title: "Informazioni della cerimonia",
    description:
      "Dati di base che compaiono sulla copertina e nelle intestazioni. Compilazione guidata — non c'è nulla di libero, solo cose che servono davvero.",
  },
  rito: {
    eyebrow: "Rito",
    title: "Tipo di rito",
    description:
      "Questa scelta determina i blocchi che appariranno nel libretto. Puoi cambiarla dopo — nulla di quello che hai già scritto va perso.",
  },
  letture: {
    eyebrow: "Letture",
    title: "Liturgia della Parola",
    description:
      "Scegli dalla libreria i testi più comuni per un matrimonio, oppure inserisci un passo personalizzato concordato con il celebrante.",
  },
  personalizzazioni: {
    eyebrow: "Personalizzazioni",
    title: "Canti, preghiere e ringraziamenti",
    description:
      "Le parti che rendono il libretto tuo. Niente placeholder vuoti — quello che lasci in bianco non appare nel libretto.",
  },
  stile: {
    eyebrow: "Stile",
    title: "Scegli un tema",
    description:
      "Pochi controlli, decisioni già prese bene. Se vuoi intervenire sui dettagli, apri l'avanzato.",
  },
  anteprima: {
    eyebrow: "Anteprima",
    title: "Controlla ed esporta",
    description:
      "Un'ultima verifica prima di generare PDF e link digitale per gli invitati.",
  },
} as const;

/**
 * Step-based editor pane (left side of the split layout).
 * One step at a time, with a sticky-feeling footer nav (Indietro / Avanti).
 * The Letture step delegates reading-picking to a right-side library drawer.
 */
export default function BookletEditor({
  content,
  onChange,
  stepIdx,
  setStepIdx,
  partner1,
  partner2,
}: Props) {
  const [drawerSlot, setDrawerSlot] = useState<ReadingSlot | null>(null);

  const stepDef = STEPS[stepIdx];
  const head = STEP_HEADERS[stepDef.id as keyof typeof STEP_HEADERS];

  const openLibrary = (slot: ReadingSlot) => setDrawerSlot(slot);

  const handlePick = (slot: ReadingSlot, id: string) => {
    onChange({
      readings: {
        ...content.readings,
        [slot]: id,
        // turn off custom-text override when a library item is chosen
        ...(slot === "first_reading" ? { use_custom_first_reading: false } : {}),
        ...(slot === "psalm" ? { use_custom_psalm: false } : {}),
        ...(slot === "second_reading" ? { use_custom_second_reading: false } : {}),
        ...(slot === "gospel" ? { use_custom_gospel: false } : {}),
      },
    });
    setDrawerSlot(null);
  };

  const isLast = stepIdx === STEPS.length - 1;
  const isFirst = stepIdx === 0;

  return (
    <div className="max-w-[680px] mx-auto px-9 py-8 pb-32">
      <BookletStepHeader
        step={head.eyebrow}
        title={head.title}
        description={head.description}
      />

      <div className="mt-6 space-y-5">
        {stepDef.id === "setup" && <BookletStepSetup content={content} onChange={onChange} />}
        {stepDef.id === "rito" && <BookletStepRite content={content} onChange={onChange} />}
        {stepDef.id === "letture" && (
          <ReadingsWithLibrary content={content} onChange={onChange} onOpenLibrary={openLibrary} />
        )}
        {stepDef.id === "personalizzazioni" && (
          <BookletStepCustom content={content} onChange={onChange} />
        )}
        {stepDef.id === "stile" && <BookletStepStyle content={content} onChange={onChange} />}
        {stepDef.id === "anteprima" && (
          <BookletStepPreview
            content={content}
            partner1={partner1}
            partner2={partner2}
            onGoToStep={(s) => setStepIdx(s - 1)}
          />
        )}
      </div>

      {/* Footer nav */}
      <div className="mt-10 pt-5 border-t border-[hsl(var(--paper-border))] flex justify-between items-center">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => setStepIdx(Math.max(0, stepIdx - 1))}
          className="inline-flex items-center gap-1.5 h-9 px-3 text-sm text-[hsl(var(--paper-ink-2))] hover:text-[hsl(var(--paper-ink))] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isFirst ? "Inizio" : STEPS[stepIdx - 1].label}
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => setStepIdx(Math.min(STEPS.length - 1, stepIdx + 1))}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[hsl(var(--paper-brand))] text-white text-sm font-medium hover:bg-[hsl(var(--paper-brand-ink))] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLast ? "Fine" : STEPS[stepIdx + 1].label}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <ReadingsLibraryDrawer
        open={drawerSlot !== null}
        slot={drawerSlot}
        content={content}
        onPick={handlePick}
        onClose={() => setDrawerSlot(null)}
      />
    </div>
  );
}

/* ─── Letture step wrapper ────────────────────────────────────────────────
 * Re-renders the existing readings step but adds a small "Scegli dalla
 * libreria" call-to-action above each slot. Until we redesign the inner
 * step, this is the lightest-touch way to surface the library drawer. */
function ReadingsWithLibrary({
  content,
  onChange,
  onOpenLibrary,
}: {
  content: MassBookletContent;
  onChange: (p: Partial<MassBookletContent>) => void;
  onOpenLibrary: (slot: ReadingSlot) => void;
}) {
  const slots: { slot: ReadingSlot; label: string }[] = [
    { slot: "first_reading", label: "Prima Lettura" },
    { slot: "psalm", label: "Salmo Responsoriale" },
    { slot: "second_reading", label: "Seconda Lettura" },
    { slot: "gospel", label: "Vangelo" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {slots.map((s) => (
          <button
            key={s.slot}
            type="button"
            onClick={() => onOpenLibrary(s.slot)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[hsl(var(--paper-border))] bg-[hsl(var(--paper-surface))] text-xs text-[hsl(var(--paper-ink-2))] hover:bg-[hsl(var(--paper-surface-muted))] hover:text-[hsl(var(--paper-ink))] transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            Scegli {s.label}
          </button>
        ))}
      </div>
      <BookletStepReadings content={content} onChange={onChange} />
    </div>
  );
}
