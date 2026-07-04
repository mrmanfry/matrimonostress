import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { FONT_LABELS, GOOGLE_FONT_TTF_MAP, loadGoogleFontForPreview, type TableauStyle, type TableauBgFit } from "@/lib/tableauGeneratorEngine";
import { useEffect } from "react";

interface Props {
  style: TableauStyle;
  onChange: (s: TableauStyle) => void;
}

export function TableauStylePanel({ style, onChange }: Props) {
  useEffect(() => {
    loadGoogleFontForPreview(style.fontFamily);
  }, [style.fontFamily]);

  return (
    <div className="space-y-5 p-4">
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Font</Label>
        <Select value={style.fontFamily} onValueChange={(v) => onChange({ ...style, fontFamily: v })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            {Object.keys(GOOGLE_FONT_TTF_MAP).map((k) => (
              <SelectItem key={k} value={k}>{FONT_LABELS[k] ?? k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Colore testo</Label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="color"
            value={style.fontColor}
            onChange={(e) => onChange({ ...style, fontColor: e.target.value })}
            className="h-9 w-14 rounded border cursor-pointer"
          />
          <Input value={style.fontColor} onChange={(e) => onChange({ ...style, fontColor: e.target.value })} />
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          Dimensione ({style.baseFontSize}pt)
        </Label>
        <Slider
          min={8}
          max={32}
          step={1}
          value={[style.baseFontSize]}
          onValueChange={([v]) => onChange({ ...style, baseFontSize: v })}
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Titolo tavolo: {(style.baseFontSize * 1.4).toFixed(0)}pt
        </p>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Allineamento</Label>
        <ToggleGroup
          type="single"
          value={style.textAlign}
          onValueChange={(v) => v && onChange({ ...style, textAlign: v as any })}
          className="mt-1 justify-start"
        >
          <ToggleGroupItem value="left"><AlignLeft className="w-4 h-4" /></ToggleGroupItem>
          <ToggleGroupItem value="center"><AlignCenter className="w-4 h-4" /></ToggleGroupItem>
          <ToggleGroupItem value="right"><AlignRight className="w-4 h-4" /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Visualizzazione</Label>
        <Select value={style.displayMode} onValueChange={(v) => onChange({ ...style, displayMode: v as any })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Nome Cognome</SelectItem>
            <SelectItem value="first">Solo Nome</SelectItem>
            <SelectItem value="family">Per Famiglia</SelectItem>
          </SelectContent>
        </Select>
        {style.displayMode === "first" && (
          <div className="flex items-center justify-between mt-3 gap-2">
            <Label htmlFor="surname-init" className="text-xs cursor-pointer">
              Iniziale cognome per omonimi
            </Label>
            <Switch
              id="surname-init"
              checked={!!style.surnameInitialForDuplicates}
              onCheckedChange={(v) => onChange({ ...style, surnameInitialForDuplicates: v })}
            />
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Adattamento sfondo</Label>
        <Select
          value={style.bgFit ?? "cover"}
          onValueChange={(v) => onChange({ ...style, bgFit: v as TableauBgFit })}
        >
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Adatta (bordi)</SelectItem>
            <SelectItem value="cover">Riempi (ritaglia)</SelectItem>
          </SelectContent>
        </Select>
        {(style.bgFit ?? "cover") === "contain" && (
          <div className="flex items-center gap-2 mt-2">
            <Label className="text-xs">Colore bordi</Label>
            <input
              type="color"
              value={style.bgBandsColor ?? "#ffffff"}
              onChange={(e) => onChange({ ...style, bgBandsColor: e.target.value })}
              className="h-8 w-12 rounded border cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}
