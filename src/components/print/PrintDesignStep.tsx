import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

export type FontStyle = 'serif' | 'sans' | 'cursive';

interface PrintDesignStepProps {
  backgroundImage: string | null;
  onBackgroundChange: (url: string | null) => void;
  welcomeText: string;
  onWelcomeTextChange: (text: string) => void;
  fontStyle: FontStyle;
  onFontStyleChange: (style: FontStyle) => void;
  showSafeZone: boolean;
  onShowSafeZoneChange: (show: boolean) => void;
}

const FONT_MAP: Record<FontStyle, string> = {
  serif: "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
  sans: "'Lato', 'Inter', system-ui, sans-serif",
  cursive: "'Dancing Script', 'Great Vibes', cursive",
};

const FONT_LABELS: Record<FontStyle, string> = {
  serif: 'Elegante (Serif)',
  sans: 'Moderno (Sans)',
  cursive: 'Romantico (Corsivo)',
};

const PrintDesignStep = ({
  backgroundImage,
  onBackgroundChange,
  welcomeText,
  onWelcomeTextChange,
  fontStyle,
  onFontStyleChange,
  showSafeZone,
  onShowSafeZoneChange,
}: PrintDesignStepProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onBackgroundChange(url);
  };

  const fontFamily = FONT_MAP[fontStyle];

  return (
    <div className="flex flex-col md:flex-row h-full gap-4 md:gap-0">
      {/* Sidebar Controls */}
      <div className="w-full md:w-[30%] p-4 md:p-6 space-y-6 overflow-y-auto border-b md:border-b-0 md:border-r border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Immagine di sfondo</h3>
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
                alt="Sfondo invito"
                className="w-full aspect-video object-cover rounded-lg border border-border"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Cambia
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onBackgroundChange(null)}
                >
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
              <span className="text-sm">Carica immagine</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcome-text">Testo di Benvenuto</Label>
          <Textarea
            id="welcome-text"
            value={welcomeText}
            onChange={(e) => onWelcomeTextChange(e.target.value)}
            placeholder="Siamo felici di invitarvi al nostro matrimonio..."
            rows={4}
          />
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
                  {FONT_LABELS[key]}
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
          }}
        >
          {/* Background image */}
          {backgroundImage && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}

          {/* Gradient overlay */}
          {backgroundImage && (
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(255,255,255,0.6) 75%, rgba(255,255,255,0.9) 100%)',
              }}
            />
          )}

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

          {/* Content */}
          <div className="relative h-full flex flex-col justify-between p-6 md:p-8 z-10">
            {/* Welcome text */}
            <div className="text-center pt-6">
              <p
                className="text-base md:text-lg leading-relaxed whitespace-pre-line"
                style={{
                  fontFamily,
                  color: backgroundImage ? '#ffffff' : 'hsl(var(--foreground))',
                  textShadow: backgroundImage ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
                }}
              >
                {welcomeText || (
                  <span className="opacity-40 italic">Il tuo testo apparirà qui...</span>
                )}
              </p>
            </div>

            {/* Footer mock */}
            <div className="bg-white/95 rounded-xl p-4 text-center space-y-2">
              <p className="text-sm font-semibold text-foreground italic">
                Gentilissima Famiglia Rossi
              </p>
              <div className="flex justify-center">
                <div className="w-[80px] h-[80px] bg-muted/50 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                </div>
              </div>
              <p className="text-[9px] font-mono text-muted-foreground">
                wedsapp.it/rsvp/token123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintDesignStep;

export { FONT_MAP };
