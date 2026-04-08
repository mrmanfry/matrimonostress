import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image as ImageIcon, Type, Palette, LayoutTemplate, X } from "lucide-react";
import type { MassBookletContent, MassBookletStyle } from "@/lib/massBookletSchema";

interface Props {
  content: MassBookletContent;
  onChange: (patch: Partial<MassBookletContent>) => void;
}

const HEADING_FONTS = [
  { value: "Times-Bold", label: "Times (Classico)" },
  { value: "Times-Roman", label: "Times Leggero" },
];

const BODY_FONTS = [
  { value: "Helvetica", label: "Helvetica (Sans-serif)" },
  { value: "Courier", label: "Courier (Monospace)" },
];

const COVER_LAYOUTS = [
  { value: "text_only", label: "Solo testo", desc: "Nessuna immagine" },
  { value: "image_top", label: "Immagine sopra", desc: "Immagine in alto, testo sotto" },
  { value: "image_bottom", label: "Immagine sotto", desc: "Testo in alto, immagine sotto" },
  { value: "image_background", label: "Sfondo", desc: "Immagine a tutto sfondo" },
];

export default function BookletStepStyle({ content, onChange }: Props) {
  const style = content.style;

  const updateStyle = (patch: Partial<MassBookletStyle>) => {
    onChange({ style: { ...style, ...patch } });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("L'immagine deve essere inferiore a 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateStyle({ cover_image_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold mb-1">Stile del Libretto</h2>
        <p className="text-sm text-muted-foreground">
          Personalizza font, colori e copertina del tuo libretto.
        </p>
      </div>

      {/* Typography */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Type className="w-4 h-4" /> Tipografia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Font Titoli</Label>
              <Select value={style.heading_font} onValueChange={(v) => updateStyle({ heading_font: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HEADING_FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Font Corpo</Label>
              <Select value={style.body_font} onValueChange={(v) => updateStyle({ body_font: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BODY_FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Dimensione Titoli: {style.heading_size}pt</Label>
              <Slider
                min={12} max={20} step={0.5}
                value={[style.heading_size]}
                onValueChange={([v]) => updateStyle({ heading_size: v })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Dimensione Corpo: {style.body_size}pt</Label>
              <Slider
                min={9} max={13} step={0.5}
                value={[style.body_size]}
                onValueChange={([v]) => updateStyle({ body_size: v })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="w-4 h-4" /> Colori
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Titoli</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.heading_color}
                  onChange={(e) => updateStyle({ heading_color: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input
                  value={style.heading_color}
                  onChange={(e) => updateStyle({ heading_color: e.target.value })}
                  className="font-mono text-xs h-8"
                  maxLength={7}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Accenti / Sottotitoli</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.subtitle_color}
                  onChange={(e) => updateStyle({ subtitle_color: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input
                  value={style.subtitle_color}
                  onChange={(e) => updateStyle({ subtitle_color: e.target.value })}
                  className="font-mono text-xs h-8"
                  maxLength={7}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Rubriche</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.rubric_color}
                  onChange={(e) => updateStyle({ rubric_color: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input
                  value={style.rubric_color}
                  onChange={(e) => updateStyle({ rubric_color: e.target.value })}
                  className="font-mono text-xs h-8"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cover */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" /> Copertina
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Layout Copertina</Label>
            <RadioGroup
              value={style.cover_layout}
              onValueChange={(v) => updateStyle({ cover_layout: v as any })}
              className="grid grid-cols-2 gap-2"
            >
              {COVER_LAYOUTS.map((l) => (
                <div key={l.value} className="flex items-start gap-2 border rounded-lg p-3">
                  <RadioGroupItem value={l.value} id={`layout-${l.value}`} className="mt-0.5" />
                  <label htmlFor={`layout-${l.value}`} className="cursor-pointer">
                    <div className="text-xs font-medium">{l.label}</div>
                    <div className="text-[10px] text-muted-foreground">{l.desc}</div>
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {style.cover_layout !== "text_only" && (
            <>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Immagine Copertina
                </Label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs" />
              </div>

              {style.cover_image_url && (
                <div className="relative">
                  <img
                    src={style.cover_image_url}
                    alt="Anteprima copertina"
                    className="w-full max-h-48 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => updateStyle({ cover_image_url: null })}
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {style.cover_image_url && style.cover_layout !== "image_background" && (
                <div className="space-y-2">
                  <Label className="text-xs">Altezza immagine: {style.cover_image_height}px</Label>
                  <Slider
                    min={50} max={500} step={10}
                    value={[style.cover_image_height]}
                    onValueChange={([v]) => updateStyle({ cover_image_height: v })}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
