import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, ImageIcon, RotateCcw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import type { ImageTransform } from "./PrintInvitationEditor";

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
  imageTransform: ImageTransform;
  onImageTransformChange: (t: ImageTransform) => void;
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

const SNAP_THRESHOLD = 2; // % threshold for snap guides

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
  weddingData: weddingDataProp,
  imageTransform,
  onImageTransformChange,
}: PrintDesignStepProps) => {
  const weddingData = weddingDataProp ?? {
    partner1Name: '', partner2Name: '', weddingDate: '',
    ceremonyTime: null, ceremonyVenueName: null, ceremonyVenueAddress: null,
    receptionVenueName: null, receptionVenueAddress: null, receptionTime: null,
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onBackgroundChange(url);
    onImageTransformChange({ x: 0, y: 0, scale: 1 });
  };

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!backgroundImage) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTx: imageTransform.x,
      startTy: imageTransform.y,
    };
  }, [backgroundImage, imageTransform.x, imageTransform.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || !dragContainerRef.current) return;
    e.preventDefault();
    const rect = dragContainerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;

    let newX = dragStartRef.current.startTx + dx;
    let newY = dragStartRef.current.startTy + dy;

    // Clamp
    newX = Math.max(-50, Math.min(50, newX));
    newY = Math.max(-50, Math.min(50, newY));

    // Snap to center
    if (Math.abs(newX) < SNAP_THRESHOLD) newX = 0;
    if (Math.abs(newY) < SNAP_THRESHOLD) newY = 0;

    onImageTransformChange({ ...imageTransform, x: newX, y: newY });
  }, [isDragging, imageTransform, onImageTransformChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const showGuideH = isDragging && Math.abs(imageTransform.y) < SNAP_THRESHOLD;
  const showGuideV = isDragging && Math.abs(imageTransform.x) < SNAP_THRESHOLD;

  const fontFamily = FONT_MAP[fontStyle];
  const formattedDate = weddingData.weddingDate ? formatWeddingDate(weddingData.weddingDate) : '';
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
                <Button size="sm" variant="destructive" onClick={() => { onBackgroundChange(null); onImageTransformChange({ x: 0, y: 0, scale: 1 }); }}>
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
              <span className="text-sm">Carica foto o PNG</span>
            </button>
          )}
        </div>

        {/* Image scale slider */}
        {backgroundImage && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Dimensione immagine</Label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{Math.round(imageTransform.scale * 100)}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onImageTransformChange({ x: 0, y: 0, scale: 1 })}
                  title="Ripristina posizione"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <Slider
              value={[imageTransform.scale]}
              onValueChange={([v]) => onImageTransformChange({ ...imageTransform, scale: v })}
              min={0.5}
              max={2}
              step={0.05}
            />
            <p className="text-[10px] text-muted-foreground">Trascina la foto nell'anteprima per riposizionarla</p>
          </div>
        )}

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

          {/* TOP HALF: Photo with drag support */}
          <div
            ref={dragContainerRef}
            className="absolute top-0 left-0 right-0"
            style={{
              height: '50%',
              cursor: backgroundImage ? (isDragging ? 'grabbing' : 'grab') : 'default',
              touchAction: 'none',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {backgroundImage ? (
              <div
                className="absolute inset-0"
                style={{
                  WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                  maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                }}
              >
                <img
                  src={backgroundImage}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${imageTransform.x}%), calc(-50% + ${imageTransform.y}%)) scale(${imageTransform.scale})`,
                    minWidth: '100%',
                    minHeight: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
              </div>
            )}

            {/* Snap guides */}
            {showGuideV && (
              <div
                className="absolute top-0 bottom-0 z-30 pointer-events-none"
                style={{ left: '50%', width: '1px', backgroundColor: 'hsl(0 80% 55%)' }}
              />
            )}
            {showGuideH && (
              <div
                className="absolute left-0 right-0 z-30 pointer-events-none"
                style={{ top: '50%', height: '1px', backgroundColor: 'hsl(0 80% 55%)' }}
              />
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
            <p className="text-xs tracking-wide text-muted-foreground mb-3" style={{ fontFamily }}>
              Cari <span className="font-semibold">Famiglia Rossi</span>
            </p>
            <p className="text-base md:text-lg font-semibold text-foreground leading-tight" style={{ fontFamily }}>
              {weddingData.partner1Name || 'Anna'} e {weddingData.partner2Name || 'Marco'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-3" style={{ fontFamily }}>
              sono lieti di annunciare il loro matrimonio
            </p>
            <p className="text-sm font-medium text-foreground capitalize" style={{ fontFamily }}>
              {formattedDate || 'Sabato 15 giugno 2026'}
            </p>
            {ceremonyTime && (
              <p className="text-xs text-muted-foreground" style={{ fontFamily }}>
                alle ore {ceremonyTime}
              </p>
            )}
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
