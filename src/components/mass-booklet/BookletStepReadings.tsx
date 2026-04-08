import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import liturgiaData from "@/data/liturgia.json";
import type { MassBookletContent, MassBookletReadings } from "@/lib/massBookletSchema";

interface Props {
  content: MassBookletContent;
  onChange: (patch: Partial<MassBookletContent>) => void;
}

type ReadingKey = "first_reading" | "psalm" | "second_reading" | "gospel";

const sections: {
  key: ReadingKey;
  label: string;
  sourceKey: keyof typeof liturgiaData.readings;
  optional?: boolean;
}[] = [
  { key: "first_reading", label: "Prima Lettura", sourceKey: "first_reading" },
  { key: "psalm", label: "Salmo Responsoriale", sourceKey: "responsorial_psalm" },
  { key: "second_reading", label: "Seconda Lettura", sourceKey: "second_reading", optional: true },
  { key: "gospel", label: "Vangelo", sourceKey: "gospel" },
];

function AccordionSection({
  label,
  optional,
  readings,
  readingKey,
  sourceKey,
  onChange,
}: {
  label: string;
  optional?: boolean;
  readings: MassBookletReadings;
  readingKey: ReadingKey;
  sourceKey: keyof typeof liturgiaData.readings;
  onChange: (patch: Partial<MassBookletReadings>) => void;
}) {
  const [open, setOpen] = useState(false);
  const customKey = `use_custom_${readingKey}` as keyof MassBookletReadings;
  const customTextKey = `${readingKey}_custom` as keyof MassBookletReadings;
  const useCustom = readings[customKey] as boolean;
  const selectedId = readings[readingKey] as string | null;
  const options = liturgiaData.readings[sourceKey] as any[];

  const selected = options.find((o: any) => o.id === selectedId);
  const hasValue = useCustom
    ? !!(readings[customTextKey] as string)?.trim()
    : !!selectedId;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{label}</span>
          {optional && <Badge variant="secondary" className="text-[10px]">Opzionale</Badge>}
          {hasValue && <span className="w-2 h-2 rounded-full bg-primary" />}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={useCustom}
              onCheckedChange={(v) => onChange({ [customKey]: v })}
              id={`custom-${readingKey}`}
            />
            <Label htmlFor={`custom-${readingKey}`} className="text-xs text-muted-foreground">
              Usa testo personalizzato
            </Label>
          </div>

          {useCustom ? (
            <div className="space-y-1.5">
              <Label>Testo personalizzato</Label>
              <Textarea
                value={(readings[customTextKey] as string) || ""}
                onChange={(e) => onChange({ [customTextKey]: e.target.value })}
                rows={8}
                placeholder="Incolla qui il testo della lettura..."
                className="text-sm"
              />
            </div>
          ) : (
            <>
              <Select
                value={selectedId || ""}
                onValueChange={(v) => onChange({ [readingKey]: v || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Scegli tra le opzioni..." />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt: any) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      <span className="font-medium">{opt.title || opt.reference}</span>
                      {opt.reference && opt.title && (
                        <span className="text-muted-foreground ml-1">— {opt.reference}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selected && (
                <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed max-h-64 overflow-y-auto whitespace-pre-line">
                  <p className="font-semibold text-xs text-muted-foreground mb-2">
                    {selected.reference}
                  </p>
                  {"text" in selected && selected.text}
                  {"verses" in selected && (
                    <div className="space-y-2">
                      <p className="italic text-primary font-medium">{selected.refrain}</p>
                      {(selected.verses as string[]).map((v: string, i: number) => (
                        <p key={i}>{v}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function BookletStepReadings({ content, onChange }: Props) {
  const updateReadings = (patch: Partial<MassBookletReadings>) =>
    onChange({ readings: { ...content.readings, ...patch } });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold mb-1">Liturgia della Parola</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Seleziona le letture per la cerimonia. Puoi scegliere tra i testi più comuni o inserire un testo personalizzato.
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((s) => (
          <AccordionSection
            key={s.key}
            label={s.label}
            optional={s.optional}
            readings={content.readings}
            readingKey={s.key}
            sourceKey={s.sourceKey}
            onChange={updateReadings}
          />
        ))}
      </div>
    </div>
  );
}
