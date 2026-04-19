import { Users } from "lucide-react";

/** Editorial empty placeholder shown when no party/guest is selected. */
export function DetailEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-10 py-16">
      <div className="w-[68px] h-[68px] rounded-full bg-paper-surface-muted border border-paper-border flex items-center justify-center text-paper-ink-3 mb-5">
        <Users className="w-7 h-7" />
      </div>
      <div className="font-fraunces text-[22px] font-medium text-paper-ink tracking-tight mb-2">
        Seleziona un nucleo o un invitato
      </div>
      <div className="text-[13px] text-paper-ink-3 max-w-[300px] leading-relaxed">
        I dettagli, lo stato RSVP, il menù e le note compariranno qui, senza aprire nuove finestre.
      </div>
    </div>
  );
}
