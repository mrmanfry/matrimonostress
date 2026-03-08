import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Loader2, ExternalLink, Palette, MessageSquare, LayoutList, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildLovableUrl,
  DEFAULT_WIZARD_CHOICES,
  type WeddingPromptData,
  type WizardChoices,
} from "@/lib/generateLovableUrl";

interface Props {
  weddingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STYLE_OPTIONS = [
  { value: "Classico ed Elegante", label: "Classico ed Elegante", emoji: "🏛️" },
  { value: "Moderno e Minimalista", label: "Moderno e Minimalista", emoji: "◻️" },
  { value: "Romantico e Floreale", label: "Romantico e Floreale", emoji: "🌸" },
  { value: "Rustico e Boho", label: "Rustico e Boho", emoji: "🍂" },
];

const TONE_OPTIONS = [
  { value: "Sobrio e Formale", label: "Sobrio e Formale" },
  { value: "Leggero e Divertente", label: "Leggero e Divertente" },
];

const SECTION_OPTIONS: { key: keyof WizardChoices["sections"]; label: string }[] = [
  { key: "story", label: "La Nostra Storia" },
  { key: "dressCode", label: "Dress Code" },
  { key: "giftRegistry", label: "Lista Nozze / Istruzioni Regalo" },
  { key: "logistics", label: "Alloggi e Trasporti" },
];

const WebsiteSetupWizard = ({ weddingId, open, onOpenChange }: Props) => {
  const [weddingData, setWeddingData] = useState<WeddingPromptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [choices, setChoices] = useState<WizardChoices>(DEFAULT_WIZARD_CHOICES);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setChoices(DEFAULT_WIZARD_CHOICES);
    supabase
      .from("weddings")
      .select("partner1_name, partner2_name, wedding_date, ceremony_venue_name, ceremony_venue_address, reception_venue_name, reception_venue_address")
      .eq("id", weddingId)
      .single()
      .then(({ data }) => {
        if (data) setWeddingData({ ...data, wedding_id: weddingId });
        setLoading(false);
      });
  }, [open, weddingId]);

  const toggleSection = (key: keyof WizardChoices["sections"]) => {
    setChoices((prev) => ({
      ...prev,
      sections: { ...prev.sections, [key]: !prev.sections[key] },
    }));
  };

  const handleGenerate = () => {
    if (!weddingData) return;
    const url = buildLovableUrl(weddingData, choices);
    window.open(url, "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configura il tuo Sito Web ✨</DialogTitle>
          <DialogDescription>
            Personalizza stile e contenuto prima di generare il sito con l'AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Style */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold">Stile Visivo</Label>
            </div>
            <RadioGroup
              value={choices.style}
              onValueChange={(v) => setChoices((p) => ({ ...p, style: v }))}
              className="grid grid-cols-2 gap-2"
            >
              {STYLE_OPTIONS.map((opt) => (
                <Label
                  key={opt.value}
                  htmlFor={`style-${opt.value}`}
                  className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors text-sm ${
                    choices.style === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={`style-${opt.value}`} />
                  <span>{opt.emoji} {opt.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Tone */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold">Tono di Voce</Label>
            </div>
            <RadioGroup
              value={choices.tone}
              onValueChange={(v) => setChoices((p) => ({ ...p, tone: v }))}
              className="flex gap-3"
            >
              {TONE_OPTIONS.map((opt) => (
                <Label
                  key={opt.value}
                  htmlFor={`tone-${opt.value}`}
                  className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors text-sm flex-1 ${
                    choices.tone === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={`tone-${opt.value}`} />
                  <span>{opt.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Sections */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LayoutList className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold">Sezioni del Sito</Label>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {SECTION_OPTIONS.map((opt) => (
                <Label
                  key={opt.key}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition-colors text-sm"
                >
                  <Checkbox
                    checked={choices.sections[opt.key]}
                    onCheckedChange={() => toggleSection(opt.key)}
                  />
                  <span>{opt.label}</span>
                </Label>
              ))}
            </div>
          </div>

          <Separator />

          {/* RSVP */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold">Impostazioni RSVP</Label>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="rsvp-switch" className="text-sm cursor-pointer">
                Abilita ricezione RSVP dal sito web
              </Label>
              <Switch
                id="rsvp-switch"
                checked={choices.enableRsvp}
                onCheckedChange={(v) => setChoices((p) => ({ ...p, enableRsvp: v }))}
              />
            </div>
          </div>

          <Separator />

          {/* Warning */}
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">⚠️ Importante:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Verrai reindirizzato su un'altra pagina.</li>
              <li>Se non hai un account su Lovable, ti verrà chiesto di crearne uno gratuito per salvare e pubblicare il sito.</li>
              <li>Il bottone RSVP sul nuovo sito sarà già collegato magicamente a Nozze Senza Stress!</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleGenerate} disabled={loading || !weddingData}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="w-4 h-4 mr-2" />
            )}
            Genera Sito Magico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WebsiteSetupWizard;
