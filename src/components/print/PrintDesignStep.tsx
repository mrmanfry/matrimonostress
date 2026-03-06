import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, ImageIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

export type FontStyle =
  | 'garamond'
  | 'cormorant'
  | 'playfair'
  | 'lora'
  | 'dancing'
  | 'greatvibes'
  | 'alex'
  | 'lato'
  | 'montserrat'
  | 'josefin';

export interface WeddingPrintData {
  partner1Name: string;
  partner2Name: string;
  weddingDate: string;
  ceremonyTime: string | null;
  ceremonyVenueName: string | null;
  ceremonyVenueAddress: string | null;
  receptionVenueName: string | null;
  receptionVenueAddress: string | null;
  receptionTime: string | null;
}

interface PrintDesignStepProps {
  backgroundImage: string | null;
  onBackgroundChange: (url: string | null) => void;
  fontStyle: FontStyle;
  onFontStyleChange: (style: FontStyle) => void;
  showSafeZone: boolean;
  onShowSafeZoneChange: (show: boolean) => void;
  weddingData: WeddingPrintData;
}

export const FONT_MAP: Record<FontStyle, string> = {
  garamond: "'EB Garamond', Georgia, serif",
  cormorant: "'Cormorant Garamond', Georgia, serif",
  playfair: "'Playfair Display', Georgia, serif",
  lora: "'Lora', Georgia, serif",
  dancing: "'Dancing Script', cursive",
  greatvibes: "'Great Vibes', cursive",
  alex: "'Alex Brush', cursive",
  lato: "'Lato', system-ui, sans-serif",
  montserrat: "'Montserrat', system-ui, sans-serif",
  josefin: "'Josefin Sans', system-ui, sans-serif",
};

const FONT_LABELS: Record<FontStyle, string> = {
  garamond: 'EB Garamond (Classico)',
  cormorant: 'Cormorant (Raffinato)',
  playfair: 'Playfair Display (Editoriale)',
  lora: 'Lora (Caldo)',
  dancing: 'Dancing Script (Romantico)',
  greatvibes: 'Great Vibes (Calligrafico)',
  alex: 'Alex Brush (Firma)',
  lato: 'Lato (Moderno)',
  montserrat: 'Montserrat (Contemporaneo)',
  josefin: 'Josefin Sans (Minimalista)',
};

function formatWeddingDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    return format(d, "EEEE d MMMM yyyy", { locale: it });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  // timeStr is "HH:mm:ss" or "HH:mm"
  const parts = timeStr.split(':');
  return `${parts[0]}:${parts[1]}`;
}

const PrintDesignStep = ({
  backgroundImage,
  onBackgroundChange,
  fontStyle,
  onFontStyleChange,
  showSafeZone,
  onShowSafeZoneChange,
  weddingData,
}: PrintDesignStepProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onBackgroundChange(url);
  };

  const fontFamily = FONT_MAP[fontStyle];
  const formattedDate = formatWeddingDate(weddingData.weddingDate);
  const ceremonyTime = formatTime(weddingData.ceremonyTime);
  const hasCeremony = !!weddingData.ceremonyVenueName;
  const hasReception = !!weddingData.receptionVenueName;

  return (
    <div className="flex flex-col md:flex-row h-full gap-4 md:gap-0">
      {/* Sidebar Controls */}
      <div className="w-full md:w-[30%] p-4 md:p-6 space-y-6 overflow-y-auto border-b md:border-b-0 md:border-r border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Foto dell'invito</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          {backgroundImage ? (
            <div className="relative group">
              <img
                src={backgroundImage}
                alt="Foto invito"
                className="w-full aspect-video object-cover rounded-lg border border-border"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  Cambia
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onBackgroundChange(null)}>
                  Rimuovi
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm">Carica foto</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          <Label>Stile Font</Label>
          <Select value={fontStyle} onValueChange={(v) => onFontStyleChange(v as FontStyle)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FONT_LABELS) as FontStyle[]).map((key) => (
                <SelectItem key={key} value={key}>
                  <span style={{ fontFamily: FONT_MAP[key] }}>{FONT_LABELS[key]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="safe-zone">Mostra margini di sicurezza</Label>
          <Switch
            id="safe-zone"
            checked={showSafeZone}
            onCheckedChange={onShowSafeZoneChange}
          />
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-muted/30 flex items-center justify-center p-4 md:p-8 overflow-auto">
        <div
          className="relative bg-white shadow-xl rounded-sm overflow-hidden"
          style={{
            width: '100%',
            maxWidth: '400px',
            aspectRatio: '1 / 1.414',
            fontFamily,
          }}
        >
          {/* Safe zone indicator */}
          {showSafeZone && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                inset: '16px',
                border: '2px dashed hsl(var(--status-overdue))',
                borderRadius: '4px',
              }}
            />
          )}

          {/* TOP HALF: Photo with watercolor edges */}
          <div className="absolute top-0 left-0 right-0" style={{ height: '50%' }}>
            {backgroundImage ? (
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `url(${backgroundImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                  maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                }}
              />
            ) : (
              <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Fold line */}
          <div
            className="absolute left-[10%] right-[10%] z-10"
            style={{
              top: '50%',
              borderTop: '1px dashed hsl(var(--muted-foreground) / 0.2)',
            }}
          />

          {/* BOTTOM HALF: Formal text */}
          <div
            className="absolute left-0 right-0 bottom-0 flex flex-col items-center justify-center px-6 text-center"
            style={{ height: '50%' }}
          >
            {/* Guest name placeholder */}
            <p className="text-xs tracking-wide text-muted-foreground mb-3" style={{ fontFamily }}>
              Cari <span className="font-semibold">Famiglia Rossi</span>
            </p>

            {/* Couple names */}
            <p className="text-base md:text-lg font-semibold text-foreground leading-tight" style={{ fontFamily }}>
              {weddingData.partner1Name || 'Anna'} e {weddingData.partner2Name || 'Marco'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-3" style={{ fontFamily }}>
              sono lieti di annunciare il loro matrimonio
            </p>

            {/* Date & time */}
            <p className="text-sm font-medium text-foreground capitalize" style={{ fontFamily }}>
              {formattedDate || 'Sabato 15 giugno 2026'}
            </p>
            {ceremonyTime && (
              <p className="text-xs text-muted-foreground" style={{ fontFamily }}>
                alle ore {ceremonyTime}
              </p>
            )}

            {/* Ceremony venue */}
            {hasCeremony && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground" style={{ fontFamily }}>presso</p>
                <p className="text-sm font-medium text-foreground" style={{ fontFamily }}>
                  {weddingData.ceremonyVenueName}
                </p>
                {weddingData.ceremonyVenueAddress && (
                  <p className="text-[10px] text-muted-foreground" style={{ fontFamily }}>
                    {weddingData.ceremonyVenueAddress}
                  </p>
                )}
              </div>
            )}

            {/* Reception venue */}
            {hasReception && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground" style={{ fontFamily }}>
                  A seguire festeggeremo insieme presso
                </p>
                <p className="text-sm font-medium text-foreground" style={{ fontFamily }}>
                  {weddingData.receptionVenueName}
                </p>
              </div>
            )}

            {/* QR placeholder */}
            <div className="mt-3 flex items-center gap-2">
              <div className="w-[40px] h-[40px] bg-muted/50 rounded flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
              </div>
              <p className="text-[8px] font-mono text-muted-foreground">
                wedsapp.it/rsvp/abc12345
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintDesignStep;
