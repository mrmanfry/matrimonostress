import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type {
  MassBookletContent,
  MassBookletSongs,
  MassBookletPrayers,
  MassBookletThanks,
} from "@/lib/massBookletSchema";

interface Props {
  content: MassBookletContent;
  onChange: (patch: Partial<MassBookletContent>) => void;
}

const songFields: { key: keyof MassBookletSongs; label: string }[] = [
  { key: "entrance", label: "Ingresso" },
  { key: "gloria", label: "Gloria" },
  { key: "offertory", label: "Offertorio" },
  { key: "holy", label: "Santo" },
  { key: "peace", label: "Segno di Pace / Agnello di Dio" },
  { key: "fraction", label: "Frazione del Pane" },
  { key: "communion", label: "Comunione" },
  { key: "communion_2", label: "Comunione (2°)" },
  { key: "exit", label: "Uscita" },
];

export default function BookletStepCustom({ content, onChange }: Props) {
  const updateSongs = (patch: Partial<MassBookletSongs>) =>
    onChange({ songs: { ...content.songs, ...patch } });

  const updatePrayers = (patch: Partial<MassBookletPrayers>) =>
    onChange({ prayers: { ...content.prayers, ...patch } });

  const updateThanks = (patch: Partial<MassBookletThanks>) =>
    onChange({ thanks: { ...content.thanks, ...patch } });

  const intentions = content.prayers.intentions;

  const addIntention = () => {
    if (intentions.length >= 6) return;
    updatePrayers({ intentions: [...intentions, ""] });
  };

  const removeIntention = (i: number) =>
    updatePrayers({ intentions: intentions.filter((_, idx) => idx !== i) });

  const updateIntention = (i: number, v: string) => {
    if (v.length > 300) return;
    const next = [...intentions];
    next[i] = v;
    updatePrayers({ intentions: next });
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Songs */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Canti</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Inserisci il titolo dei canti per ogni momento della celebrazione.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {songFields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <Input
                value={content.songs[f.key]}
                onChange={(e) => updateSongs({ [f.key]: e.target.value })}
                placeholder={`Titolo canto ${f.label.toLowerCase()}`}
              />
            </div>
          ))}
        </div>
      </section>

      <hr className="border-border" />

      {/* Prayers */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Preghiere dei Fedeli</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Aggiungi fino a 6 intenzioni. Dopo ogni intenzione verrà stampato il ritornello.
        </p>

        <div className="space-y-2 mb-4">
          <Label className="text-xs">Ritornello</Label>
          <Input
            value={content.prayers.refrain}
            onChange={(e) => updatePrayers({ refrain: e.target.value })}
            placeholder="es. Ascoltaci, o Signore."
          />
        </div>

        <div className="space-y-3">
          {intentions.map((text, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Intenzione {i + 1}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {text.length}/300
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeIntention(i)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={text}
                onChange={(e) => updateIntention(i, e.target.value)}
                rows={2}
                placeholder="Scrivi l'intenzione..."
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground italic pl-2">
                {content.prayers.refrain || "Ascoltaci, o Signore."}
              </p>
            </div>
          ))}
        </div>

        {intentions.length < 6 && (
          <Button type="button" variant="outline" size="sm" onClick={addIntention} className="mt-3 gap-1">
            <Plus className="w-3.5 h-3.5" /> Aggiungi Intenzione
          </Button>
        )}
      </section>

      <hr className="border-border" />

      {/* Thanks */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Ringraziamenti</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Un testo di ringraziamento che verrà stampato nelle ultime pagine del libretto.
        </p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <Label className="text-xs">Testo</Label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {content.thanks.text.length}/2000
            </span>
          </div>
          <Textarea
            value={content.thanks.text}
            onChange={(e) => {
              if (e.target.value.length <= 2000)
                updateThanks({ text: e.target.value });
            }}
            rows={6}
            placeholder="Scrivi i ringraziamenti..."
            className="text-sm"
          />
        </div>
      </section>
    </div>
  );
}
