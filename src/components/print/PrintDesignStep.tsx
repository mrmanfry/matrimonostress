import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { Upload, ImageIcon, RotateCcw, GripVertical, QrCode } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import type { ImageTransform, EdgeStyle, TextPosition, QrPosition } from "./PrintInvitationEditor";

export type FontStyle =
'garamond' |
'cormorant' |
'playfair' |
'lora' |
'dancing' |
'greatvibes' |
'alex' |
'lato' |
'montserrat' |
'josefin' |
'cinzel' |
'philosopher' |
'librebaskerville' |
'raleway' |
'poppins' |
'merriweather' |
'crimsontext' |
'italiana';

export interface InvitationTexts {
  greeting: string;
  names: string;
  announcement: string;
  dateText: string;
  timePrefix: string;
  time: string;
  venuePrefix: string;
  ceremonyVenue: string;
  ceremonyAddress: string;
  receptionPrefix: string;
  receptionVenue: string;
  receptionAddress: string;
}

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
  edgeStyle: EdgeStyle;
  onEdgeStyleChange: (s: EdgeStyle) => void;
  hasPhoto: boolean;
  onHasPhotoChange: (v: boolean) => void;
  editableTexts: InvitationTexts;
  onEditableTextsChange: (texts: InvitationTexts) => void;
  textPosition: TextPosition;
  onTextPositionChange: (pos: TextPosition) => void;
  qrPosition: QrPosition;
  onQrPositionChange: (pos: QrPosition) => void;
  textColor: string;
  onTextColorChange: (color: string) => void;
}

const TEXT_COLOR_PRESETS = [
  { label: 'Nero', value: '#1a1a1a' },
  { label: 'Grigio scuro', value: '#4a4a4a' },
  { label: 'Oro', value: '#C9A84C' },
  { label: 'Bordeaux', value: '#722F37' },
  { label: 'Blu notte', value: '#1B2A4A' },
  { label: 'Bianco', value: '#FFFFFF' },
];

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
  cinzel: "'Cinzel', Georgia, serif",
  philosopher: "'Philosopher', Georgia, serif",
  librebaskerville: "'Libre Baskerville', Georgia, serif",
  raleway: "'Raleway', system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  merriweather: "'Merriweather', Georgia, serif",
  crimsontext: "'Crimson Text', Georgia, serif",
  italiana: "'Italiana', Georgia, serif",
};

const FONT_GROUPS: { label: string; fonts: { key: FontStyle; label: string }[] }[] = [
  {
    label: 'Classici',
    fonts: [
      { key: 'garamond', label: 'EB Garamond' },
      { key: 'cormorant', label: 'Cormorant' },
      { key: 'playfair', label: 'Playfair Display' },
      { key: 'lora', label: 'Lora' },
      { key: 'cinzel', label: 'Cinzel' },
      { key: 'librebaskerville', label: 'Libre Baskerville' },
      { key: 'merriweather', label: 'Merriweather' },
      { key: 'crimsontext', label: 'Crimson Text' },
      { key: 'italiana', label: 'Italiana' },
      { key: 'philosopher', label: 'Philosopher' },
    ],
  },
  {
    label: 'Calligrafici',
    fonts: [
      { key: 'dancing', label: 'Dancing Script' },
      { key: 'greatvibes', label: 'Great Vibes' },
      { key: 'alex', label: 'Alex Brush' },
    ],
  },
  {
    label: 'Moderni',
    fonts: [
      { key: 'lato', label: 'Lato' },
      { key: 'montserrat', label: 'Montserrat' },
      { key: 'josefin', label: 'Josefin Sans' },
      { key: 'raleway', label: 'Raleway' },
      { key: 'poppins', label: 'Poppins' },
    ],
  },
];

const SNAP_THRESHOLD = 2;

export function formatWeddingDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    return format(d, "EEEE d MMMM yyyy", { locale: it });
  } catch {
    return dateStr;
  }
}

export function formatTime(timeStr: string | null): string {
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
  edgeStyle,
  onEdgeStyleChange,
  hasPhoto,
  onHasPhotoChange,
  editableTexts,
  onEditableTextsChange,
  textPosition,
  onTextPositionChange,
  qrPosition,
  onQrPositionChange,
  textColor,
  onTextColorChange,
}: PrintDesignStepProps) => {
  const weddingData = weddingDataProp ?? {
    partner1Name: '', partner2Name: '', weddingDate: '',
    ceremonyTime: null, ceremonyVenueName: null, ceremonyVenueAddress: null,
    receptionVenueName: null, receptionVenueAddress: null, receptionTime: null
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragContainerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTextDragging, setIsTextDragging] = useState(false);
  const [isQrDragging, setIsQrDragging] = useState(false);
  const [isQrResizing, setIsQrResizing] = useState(false);
  const dragStartRef = useRef<{startX: number;startY: number;startTx: number;startTy: number;} | null>(null);
  const textDragRef = useRef<{startY: number; origY: number} | null>(null);
  const qrDragRef = useRef<{startX: number; startY: number; origX: number; origY: number} | null>(null);
  const qrResizeRef = useRef<{startX: number; origSize: number} | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onBackgroundChange(url);
    onImageTransformChange({ x: 0, y: 0, scale: 1 });
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!backgroundImage) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTx: imageTransform.x,
      startTy: imageTransform.y
    };
  }, [backgroundImage, imageTransform.x, imageTransform.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || !dragContainerRef.current) return;
    e.preventDefault();
    const rect = dragContainerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStartRef.current.startX) / rect.width * 100;
    const dy = (e.clientY - dragStartRef.current.startY) / rect.height * 100;

    let newX = dragStartRef.current.startTx + dx;
    let newY = dragStartRef.current.startTy + dy;

    newX = Math.max(-50, Math.min(50, newX));
    newY = Math.max(-50, Math.min(50, newY));

    if (Math.abs(newX) < SNAP_THRESHOLD) newX = 0;
    if (Math.abs(newY) < SNAP_THRESHOLD) newY = 0;

    onImageTransformChange({ ...imageTransform, x: newX, y: newY });
  }, [isDragging, imageTransform, onImageTransformChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setIsTextDragging(false);
    setIsQrDragging(false);
    setIsQrResizing(false);
    dragStartRef.current = null;
    textDragRef.current = null;
    qrDragRef.current = null;
    qrResizeRef.current = null;
  }, []);

  // Text block drag
  const handleTextPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsTextDragging(true);
    textDragRef.current = { startY: e.clientY, origY: textPosition.y };
  }, [textPosition.y]);

  // QR drag
  const handleQrPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsQrDragging(true);
    qrDragRef.current = { startX: e.clientX, startY: e.clientY, origX: qrPosition.x, origY: qrPosition.y };
  }, [qrPosition.x, qrPosition.y]);

  // QR resize
  const handleQrResizeDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsQrResizing(true);
    qrResizeRef.current = { startX: e.clientX, origSize: qrPosition.size };
  }, [qrPosition.size]);

  // Unified pointer move for text/QR drag on the preview container
  const handlePreviewPointerMove = useCallback((e: React.PointerEvent) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();

    if (isTextDragging && textDragRef.current) {
      e.preventDefault();
      const dy = ((e.clientY - textDragRef.current.startY) / rect.height) * 100;
      const newY = Math.max(5, Math.min(85, textDragRef.current.origY + dy));
      onTextPositionChange({ y: newY });
    }

    if (isQrDragging && qrDragRef.current) {
      e.preventDefault();
      const dx = ((e.clientX - qrDragRef.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - qrDragRef.current.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100 - qrPosition.size, qrDragRef.current.origX + dx));
      const newY = Math.max(0, Math.min(100 - qrPosition.size, qrDragRef.current.origY + dy));
      onQrPositionChange({ ...qrPosition, x: newX, y: newY });
    }

    if (isQrResizing && qrResizeRef.current) {
      e.preventDefault();
      const dx = ((e.clientX - qrResizeRef.current.startX) / rect.width) * 100;
      const newSize = Math.max(6, Math.min(35, qrResizeRef.current.origSize + dx));
      onQrPositionChange({ ...qrPosition, size: newSize });
    }
  }, [isTextDragging, isQrDragging, isQrResizing, qrPosition, onTextPositionChange, onQrPositionChange]);

  const showGuideH = isDragging && Math.abs(imageTransform.y) < SNAP_THRESHOLD;
  const showGuideV = isDragging && Math.abs(imageTransform.x) < SNAP_THRESHOLD;

  const fontFamily = FONT_MAP[fontStyle];

  const updateText = (key: keyof InvitationTexts, value: string) => {
    onEditableTextsChange({ ...editableTexts, ...{ [key]: value } });
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-4 md:gap-0">
      {/* Sidebar Controls */}
      <div className="w-full md:w-[30%] p-4 md:p-6 space-y-6 overflow-y-auto border-b md:border-b-0 md:border-r border-border">
        {/* Photo toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="has-photo">Inserisci una foto</Label>
          <Switch
            id="has-photo"
            checked={hasPhoto}
            onCheckedChange={onHasPhotoChange}
          />
        </div>

        {hasPhoto && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Foto dell'invito</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload} />
              
              {backgroundImage ? (
                <div className="relative group">
                  <img
                    src={backgroundImage}
                    alt="Foto invito"
                    className="w-full aspect-video object-cover rounded-lg border border-border" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                      Cambia
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => {onBackgroundChange(null);onImageTransformChange({ x: 0, y: 0, scale: 1 });}}>
                      Rimuovi
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Carica foto o PNG</span>
                </button>
              )}
            </div>

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
                      title="Ripristina posizione">
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <Slider
                  value={[imageTransform.scale]}
                  onValueChange={([v]) => onImageTransformChange({ ...imageTransform, scale: v })}
                  min={0.2}
                  max={2.5}
                  step={0.05} />
                <p className="text-[10px] text-muted-foreground">Trascina la foto nell'anteprima per riposizionarla</p>
              </div>
            )}

            {backgroundImage && (
              <div className="space-y-2">
                <Label>Bordo immagine</Label>
                <Select value={edgeStyle} onValueChange={(v) => onEdgeStyleChange(v as EdgeStyle)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuno (Netto)</SelectItem>
                    <SelectItem value="watercolor">Acquerello</SelectItem>
                    <SelectItem value="soft">Sfumato morbido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          <Label>Stile Font</Label>
          <Select value={fontStyle} onValueChange={(v) => onFontStyleChange(v as FontStyle)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_GROUPS.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.fonts.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      <span style={{ fontFamily: FONT_MAP[f.key] }}>{f.label}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Text color */}
        <div className="space-y-2">
          <Label>Colore testo</Label>
          <div className="flex gap-2 flex-wrap">
            {TEXT_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onTextColorChange(preset.value)}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  textColor === preset.value ? "border-primary ring-2 ring-primary/30" : "border-border"
                }`}
                style={{ backgroundColor: preset.value }}
                title={preset.label}
              />
            ))}
            <Input
              type="color"
              value={!TEXT_COLOR_PRESETS.some(p => p.value === textColor) ? textColor : '#1a1a1a'}
              onChange={(e) => onTextColorChange(e.target.value)}
              className="w-8 h-8 p-0.5 cursor-pointer rounded-lg"
              title="Colore personalizzato"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="safe-zone">Mostra margini di sicurezza</Label>
          <Switch
            id="safe-zone"
            checked={showSafeZone}
            onCheckedChange={onShowSafeZoneChange} />
        </div>

        {/* Editable texts section */}
        <div className="space-y-3 pt-2 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground">Testi dell'invito</h3>
          <div className="space-y-2">
            <Label className="text-xs">Saluto</Label>
            <Input value={editableTexts.greeting} onChange={(e) => updateText('greeting', e.target.value)} placeholder="Cari" />
            <p className="text-[10px] text-muted-foreground">
              💡 Nel PDF il saluto si adatta automaticamente: "Caro Marco", "Cara Lavinia", "Cara Famiglia Rossi" in base al nucleo.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Nomi</Label>
            <Input value={editableTexts.names} onChange={(e) => updateText('names', e.target.value)} placeholder="Anna e Marco" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Annuncio</Label>
            <Input value={editableTexts.announcement} onChange={(e) => updateText('announcement', e.target.value)} placeholder="sono lieti di annunciare il loro matrimonio" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Data</Label>
            <Input value={editableTexts.dateText} onChange={(e) => updateText('dateText', e.target.value)} placeholder="Sabato 15 giugno 2026" />
          </div>
          {editableTexts.time && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Prefisso orario</Label>
                <Input value={editableTexts.timePrefix} onChange={(e) => updateText('timePrefix', e.target.value)} placeholder="alle ore" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Orario</Label>
                <Input value={editableTexts.time} onChange={(e) => updateText('time', e.target.value)} placeholder="16:00" />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label className="text-xs">Prefisso cerimonia</Label>
            <Input value={editableTexts.venuePrefix} onChange={(e) => updateText('venuePrefix', e.target.value)} placeholder="presso" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Luogo cerimonia</Label>
            <Input value={editableTexts.ceremonyVenue} onChange={(e) => updateText('ceremonyVenue', e.target.value)} placeholder="Nome della chiesa o location" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Indirizzo cerimonia</Label>
            <Input value={editableTexts.ceremonyAddress} onChange={(e) => updateText('ceremonyAddress', e.target.value)} placeholder="Via..." />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Prefisso ricevimento</Label>
            <Input value={editableTexts.receptionPrefix} onChange={(e) => updateText('receptionPrefix', e.target.value)} placeholder="A seguire festeggeremo insieme presso" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Luogo ricevimento</Label>
            <Input value={editableTexts.receptionVenue} onChange={(e) => updateText('receptionVenue', e.target.value)} placeholder="Nome della location" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Indirizzo ricevimento</Label>
            <Input value={editableTexts.receptionAddress} onChange={(e) => updateText('receptionAddress', e.target.value)} placeholder="Via..." />
          </div>
        </div>

        {/* Position controls */}
        <div className="space-y-3 pt-2 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <GripVertical className="w-4 h-4" />
            Posizione elementi
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Posizione testo</Label>
              <span className="text-[10px] text-muted-foreground">{Math.round(textPosition.y)}%</span>
            </div>
            <Slider
              value={[textPosition.y]}
              onValueChange={([v]) => onTextPositionChange({ y: v })}
              min={5}
              max={85}
              step={1}
            />
            <p className="text-[10px] text-muted-foreground">Trascina il blocco testo nell'anteprima oppure usa lo slider</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1"><QrCode className="w-3 h-3" /> Dimensione QR</Label>
              <span className="text-[10px] text-muted-foreground">{Math.round(qrPosition.size)}%</span>
            </div>
            <Slider
              value={[qrPosition.size]}
              onValueChange={([v]) => onQrPositionChange({ ...qrPosition, size: v })}
              min={6}
              max={35}
              step={1}
            />
            <p className="text-[10px] text-muted-foreground">Trascina il QR code nell'anteprima per spostarlo</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              onTextPositionChange({ y: hasPhoto ? 55 : 30 });
              onQrPositionChange({ x: 42, y: 85, size: 15 });
            }}
          >
            <RotateCcw className="w-3 h-3 mr-2" />
            Ripristina posizioni
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div
        className="flex-1 bg-muted/30 flex items-center justify-center p-4 md:p-8 overflow-auto"
        onPointerMove={handlePreviewPointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          ref={previewRef}
          className="relative bg-white shadow-xl rounded-sm overflow-hidden select-none"
          style={{
            width: '100%',
            maxWidth: '400px',
            aspectRatio: '1 / 1.414',
            fontFamily,
            touchAction: 'none',
          }}>
          
          {/* Safe zone indicator */}
          {showSafeZone && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                inset: '16px',
                border: '2px dashed hsl(var(--status-overdue))',
                borderRadius: '4px'
              }} />
          )}

          {hasPhoto && (
            <>
              {/* Photo area with drag support */}
              <div
                ref={dragContainerRef}
                className="absolute top-0 left-0 right-0"
                style={{
                  height: '50%',
                  cursor: backgroundImage ? isDragging ? 'grabbing' : 'grab' : 'default',
                  touchAction: 'none',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff'
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}>
                
                {backgroundImage ? (
                  <div
                    className="absolute inset-0"
                    style={{
                      ...(edgeStyle === 'watercolor' ? {
                        WebkitMaskImage: 'url(/images/watercolor-mask.png)',
                        maskImage: 'url(/images/watercolor-mask.png)',
                        WebkitMaskSize: 'cover',
                        maskSize: 'cover',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat'
                      } : edgeStyle === 'soft' ? {
                        WebkitMaskImage: 'radial-gradient(ellipse 85% 80% at 50% 45%, black 50%, transparent 95%)',
                        maskImage: 'radial-gradient(ellipse 85% 80% at 50% 45%, black 50%, transparent 95%)'
                      } : {})
                    }}>
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
                        userSelect: 'none'
                      }} />
                  </div>
                ) : (
                  <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}

                {showGuideV && (
                  <div
                    className="absolute top-0 bottom-0 z-30 pointer-events-none"
                    style={{ left: '50%', width: '1px', backgroundColor: 'hsl(0 80% 55%)' }} />
                )}
                {showGuideH && (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none"
                    style={{ top: '50%', height: '1px', backgroundColor: 'hsl(0 80% 55%)' }} />
                )}
              </div>
            </>
          )}

          {/* Text block — draggable vertically */}
          <div
            className="absolute left-0 right-0 z-10 flex flex-col items-center px-6 text-center"
            style={{
              top: `${textPosition.y}%`,
              cursor: isTextDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
            onPointerDown={handleTextPointerDown}
          >
            <div className="pointer-events-none">
              {renderTextContent(editableTexts, fontFamily, textColor)}
            </div>
          </div>

          {/* QR Code overlay — draggable + resizable */}
          <div
            className="absolute z-10"
            style={{
              left: `${qrPosition.x}%`,
              top: `${qrPosition.y}%`,
              width: `${qrPosition.size}%`,
              aspectRatio: '1 / 1',
              cursor: isQrDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
            onPointerDown={handleQrPointerDown}
          >
            <div
              className="w-full h-full flex items-center justify-center rounded-sm"
              style={{
                backgroundColor: '#ffffff',
                padding: '8%',
                border: '2px dashed hsl(var(--primary))',
              }}
            >
              <QRCodeSVG
                value="https://example.com/rsvp/preview"
                size={200}
                fgColor="#000000"
                bgColor="transparent"
                level="M"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            {/* Resize handle */}
            <div
              className="absolute -right-1.5 -bottom-1.5 w-4 h-4 bg-primary rounded-full cursor-se-resize border-2 border-background shadow-sm z-20"
              onPointerDown={handleQrResizeDown}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

function renderTextContent(texts: InvitationTexts, fontFamily: string, textColor: string) {
  const mainColor = textColor || '#1a1a1a';
  const secondaryColor = textColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : textColor === '#1a1a1a' ? undefined : `${textColor}99`;
  
  return (
    <>
      {texts.greeting && (
        <p className={`text-xs tracking-wide mb-3 ${!secondaryColor ? 'text-muted-foreground' : ''}`} style={{ fontFamily, color: secondaryColor }}>
          {texts.greeting} <span className="font-semibold">Famiglia Rossi</span>
        </p>
      )}
      {texts.names && (
        <p className="text-base md:text-lg font-semibold leading-tight" style={{ fontFamily, color: mainColor }}>
          {texts.names}
        </p>
      )}
      {texts.announcement && (
        <p className={`text-xs mt-1 mb-3 ${!secondaryColor ? 'text-muted-foreground' : ''}`} style={{ fontFamily, color: secondaryColor }}>
          {texts.announcement}
        </p>
      )}
      {texts.dateText && (
        <p className="text-sm font-medium capitalize" style={{ fontFamily, color: mainColor }}>
          {texts.dateText}
        </p>
      )}
      {texts.time && texts.timePrefix && (
        <p className={`text-xs ${!secondaryColor ? 'text-muted-foreground' : ''}`} style={{ fontFamily, color: secondaryColor }}>
          {texts.timePrefix} {texts.time}
        </p>
      )}
      {texts.ceremonyVenue && (
        <div className="mt-2">
          {texts.venuePrefix && (
            <p className={`text-xs ${!secondaryColor ? 'text-muted-foreground' : ''}`} style={{ fontFamily, color: secondaryColor }}>{texts.venuePrefix}</p>
          )}
          <p className="text-sm font-medium" style={{ fontFamily, color: mainColor }}>
            {texts.ceremonyVenue}
          </p>
          {texts.ceremonyAddress && (
            <p className={`text-[10px] ${!secondaryColor ? 'text-muted-foreground' : ''}`} style={{ fontFamily, color: secondaryColor }}>
              {texts.ceremonyAddress}
            </p>
          )}
        </div>
      )}
      {texts.receptionVenue && (
        <div className="mt-2">
          {texts.receptionPrefix && (
            <p className={`text-xs ${!secondaryColor ? 'text-muted-foreground' : ''}`} style={{ fontFamily, color: secondaryColor }}>
              {texts.receptionPrefix}
            </p>
          )}
          <p className="text-sm font-medium" style={{ fontFamily, color: mainColor }}>
            {texts.receptionVenue}
          </p>
          {texts.receptionAddress && (
            <p className={`text-[10px] ${!secondaryColor ? 'text-muted-foreground' : ''}`} style={{ fontFamily, color: secondaryColor }}>
              {texts.receptionAddress}
            </p>
          )}
        </div>
      )}
    </>
  );
}

export default PrintDesignStep;
