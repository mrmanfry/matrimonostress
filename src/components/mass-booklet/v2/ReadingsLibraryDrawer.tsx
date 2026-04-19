import { useMemo, useState } from "react";
import { Search, X, BookOpen } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import liturgiaData from "@/data/liturgia.json";
import type { MassBookletContent } from "@/lib/massBookletSchema";

export type ReadingSlot = "first_reading" | "psalm" | "second_reading" | "gospel";

const SLOT_LABEL: Record<ReadingSlot, string> = {
  first_reading: "Prima Lettura",
  psalm: "Salmo Responsoriale",
  second_reading: "Seconda Lettura",
  gospel: "Vangelo",
};

const SLOT_SOURCE: Record<ReadingSlot, keyof typeof liturgiaData.readings> = {
  first_reading: "first_reading",
  psalm: "responsorial_psalm",
  second_reading: "second_reading",
  gospel: "gospel",
};

interface Props {
  open: boolean;
  slot: ReadingSlot | null;
  content: MassBookletContent;
  onPick: (slot: ReadingSlot, id: string) => void;
  onClose: () => void;
}

/**
 * Right-side sheet with a searchable list of liturgical readings.
 * Renders one slot at a time (first_reading, psalm, second_reading, gospel).
 */
export default function ReadingsLibraryDrawer({ open, slot, content, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    if (!slot) return [];
    const list = liturgiaData.readings[SLOT_SOURCE[slot]] || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((it: any) => {
      const title = (it.title || "").toLowerCase();
      const ref = (it.reference || "").toLowerCase();
      return title.includes(q) || ref.includes(q);
    });
  }, [slot, query]);

  const currentId = slot ? content.readings[slot] : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[440px] p-0 flex flex-col bg-[hsl(var(--paper-surface))] border-[hsl(var(--paper-border))]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[hsl(var(--paper-border))] flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-[hsl(var(--paper-ink-3))]">
              Libreria testi
            </div>
            <div className="font-fraunces text-xl text-[hsl(var(--paper-ink))] mt-0.5">
              {slot ? SLOT_LABEL[slot] : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[hsl(var(--paper-ink-2))] hover:bg-[hsl(var(--paper-surface-muted))]"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[hsl(var(--paper-border))]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--paper-ink-3))]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca tra i testi più comuni…"
              className="pl-9 h-9 bg-[hsl(var(--paper-surface))] border-[hsl(var(--paper-border))]"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto px-3 py-2">
          {items.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-[hsl(var(--paper-ink-3))]">
              Nessun testo trovato
            </div>
          )}
          {items.map((it: any) => {
            const selected = currentId === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => slot && onPick(slot, it.id)}
                className={`w-full text-left px-3.5 py-3 mb-1 rounded-md transition-colors flex flex-col gap-1 border ${
                  selected
                    ? "bg-[hsl(var(--paper-brand-tint))] border-[hsl(var(--paper-brand))]/40"
                    : "border-transparent hover:bg-[hsl(var(--paper-surface-muted))]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[hsl(var(--paper-ink))]">
                    {it.reference || it.title}
                  </span>
                  {selected && (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[hsl(var(--paper-brand))] text-white font-medium">
                      Selezionato
                    </span>
                  )}
                </div>
                <span className="text-xs text-[hsl(var(--paper-ink-2))] italic line-clamp-2">
                  {it.title}
                </span>
              </button>
            );
          })}

          <div className="flex items-center gap-2 mt-3 px-3.5 py-3 rounded-md border border-dashed border-[hsl(var(--paper-border-strong))] text-sm text-[hsl(var(--paper-ink-2))]">
            <BookOpen className="w-3.5 h-3.5" />
            Per inserire un testo personalizzato chiudi e attiva l'opzione "testo
            personalizzato" nello step Letture.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
