import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { MassBookletContent } from "@/lib/massBookletSchema";

interface Props {
  content: MassBookletContent;
  onChange: (patch: Partial<MassBookletContent>) => void;
}

function ArrayField({
  label,
  values,
  onChange,
  placeholder,
  max = 4,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const add = () => onChange([...values, ""]);
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const update = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={v}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      {values.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> Aggiungi
        </Button>
      )}
    </div>
  );
}

export default function BookletStepSetup({ content, onChange }: Props) {
  const updateRoles = (patch: Partial<MassBookletContent["roles"]>) =>
    onChange({ roles: { ...content.roles, ...patch } });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold mb-1">Setup della Cerimonia</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Inserisci le informazioni di base. Questi dati appariranno sulla copertina e nelle intestazioni del libretto.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="church">Nome della Chiesa *</Label>
          <Input
            id="church"
            value={content.church_name}
            onChange={(e) => onChange({ church_name: e.target.value })}
            placeholder="es. Chiesa di San Marco"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priest">Nome del Celebrante *</Label>
          <Input
            id="priest"
            value={content.priest_name}
            onChange={(e) => onChange({ priest_name: e.target.value })}
            placeholder="es. Don Marco Rossi"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date_text">Data della Cerimonia (testo per il libretto)</Label>
        <Input
          id="date_text"
          value={content.ceremony_date_text}
          onChange={(e) => onChange({ ceremony_date_text: e.target.value })}
          placeholder="es. Sabato 20 Settembre 2026"
        />
      </div>

      <hr className="border-border" />

      <div>
        <h3 className="text-sm font-semibold mb-3">Ruoli</h3>
        <div className="space-y-5">
          <ArrayField
            label="Testimoni Sposo"
            values={content.roles.witnesses_groom}
            onChange={(v) => updateRoles({ witnesses_groom: v })}
            placeholder="Nome e cognome"
          />
          <ArrayField
            label="Testimoni Sposa"
            values={content.roles.witnesses_bride}
            onChange={(v) => updateRoles({ witnesses_bride: v })}
            placeholder="Nome e cognome"
          />
          <ArrayField
            label="Lettori"
            values={content.roles.readers}
            onChange={(v) => updateRoles({ readers: v })}
            placeholder="Nome e cognome"
            max={6}
          />
          <div className="space-y-1.5">
            <Label htmlFor="musicians">Musicisti</Label>
            <Input
              id="musicians"
              value={content.roles.musicians}
              onChange={(e) => updateRoles({ musicians: e.target.value })}
              placeholder="es. Quartetto d'archi, Coro parrocchiale"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
