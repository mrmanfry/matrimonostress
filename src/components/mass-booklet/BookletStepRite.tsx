import { cn } from "@/lib/utils";
import { BookOpen, Cross } from "lucide-react";
import type { MassBookletContent } from "@/lib/massBookletSchema";

interface Props {
  content: MassBookletContent;
  onChange: (patch: Partial<MassBookletContent>) => void;
}

const options = [
  {
    value: "messa_eucaristia" as const,
    icon: Cross,
    title: "Messa con Eucaristia",
    desc: "Rito completo con Liturgia Eucaristica (Offertorio, Consacrazione, Comunione). La scelta più comune per il matrimonio cattolico.",
  },
  {
    value: "liturgia_parola" as const,
    icon: BookOpen,
    title: "Liturgia della Parola",
    desc: "Celebrazione senza Eucaristia. Adatta per matrimoni misti o quando concordato con il celebrante. Include le letture e il rito del consenso.",
  },
];

export default function BookletStepRite({ content, onChange }: Props) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold mb-1">Tipo di Rito</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Scegli la struttura della cerimonia. Questa scelta determinerà quali sezioni appariranno nel libretto.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = content.rite_type === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ rite_type: opt.value })}
              className={cn(
                "flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 shadow-soft"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <Icon className={cn("w-7 h-7", selected ? "text-primary" : "text-muted-foreground")} />
              <div>
                <p className="font-semibold text-sm">{opt.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{opt.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
