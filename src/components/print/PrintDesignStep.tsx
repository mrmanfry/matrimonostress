import { useRef, useState, useCallback, useEffect } from "react";
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
import { Upload, ImageIcon, RotateCcw, GripVertical, QrCode, Plus, X, ChevronUp, ChevronDown, Type, Palette, MousePointer, Undo2, Redo2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import type { ImageTransform, EdgeStyle, QrPosition } from "./PrintInvitationEditor";

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

// Legacy type kept for backward compatibility / migration
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

export type TextBlockType =
  | 'greeting' | 'names' | 'announcement' | 'dateText'
  | 'timePrefix_time' | 'venuePrefix' | 'ceremonyVenue' | 'ceremonyAddress'
  | 'receptionPrefix' | 'receptionVenue' | 'receptionAddress'
  | 'custom';

export type TextBlockStyle = 'primary' | 'secondary' | 'tertiary';

export interface TextBlock {
  id: string;
  type: TextBlockType;
  label: string;
  value: string;
  style: TextBlockStyle;
  x: number;  // % from left (center = 50)
  y: number;  // % from top
  fontOverride?: FontStyle;
  colorOverride?: string;
}

// --- Migration utility ---
let _blockIdCounter = 0;
function makeBlockId() {
  _blockIdCounter++;
  return `tb_${Date.now()}_${_blockIdCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

export function migrateTextsToBlocks(old: InvitationTexts): TextBlock[] {
  const blocks: TextBlock[] = [];
  let yPos = 55;
  const push = (type: TextBlockType, label: string, value: string, style: TextBlockStyle) => {
    blocks.push({ id: makeBlockId(), type, label, value, style, x: 50, y: yPos });
    yPos += 4;
  };
  push('greeting', 'Saluto', old.greeting || '', 'secondary');
  push('names', 'Nomi', old.names || '', 'primary');
  push('announcement', 'Annuncio', old.announcement || '', 'secondary');
  push('dateText', 'Data', old.dateText || '', 'primary');
  if (old.time) {
    push('timePrefix_time', 'Orario', old.timePrefix && old.time ? `${old.timePrefix} ${old.time}` : old.time, 'secondary');
  }
  push('venuePrefix', 'Prefisso cerimonia', old.venuePrefix || '', 'secondary');
  push('ceremonyVenue', 'Luogo cerimonia', old.ceremonyVenue || '', 'primary');
  if (old.ceremonyAddress) {
    push('ceremonyAddress', 'Indirizzo cerimonia', old.ceremonyAddress, 'tertiary');
  }
  push('receptionPrefix', 'Prefisso ricevimento', old.receptionPrefix || '', 'secondary');
  push('receptionVenue', 'Luogo ricevimento', old.receptionVenue || '', 'primary');
  if (old.receptionAddress) {
    push('receptionAddress', 'Indirizzo ricevimento', old.receptionAddress, 'tertiary');
  }
  return blocks;
}

export function buildDefaultBlocks(wd: WeddingPrintData): TextBlock[] {
  const ft = formatTime(wd.ceremonyTime);
  return migrateTextsToBlocks({
    greeting: 'Cari',
    names: `${wd.partner1Name} e ${wd.partner2Name}`,
    announcement: 'sono lieti di annunciare il loro matrimonio',
    dateText: wd.weddingDate ? formatWeddingDate(wd.weddingDate) : '',
    timePrefix: 'alle ore',
    time: ft,
    venuePrefix: 'presso',
    ceremonyVenue: wd.ceremonyVenueName || '',
    ceremonyAddress: wd.ceremonyVenueAddress || '',
    receptionPrefix: 'A seguire festeggeremo insieme presso',
    receptionVenue: wd.receptionVenueName || '',
    receptionAddress: wd.receptionVenueAddress || '',
  });
}

/** Ensure blocks have x/y (migration from old schema) */
export function ensureBlockPositions(blocks: TextBlock[], hasPhoto: boolean): TextBlock[] {
  const startY = hasPhoto ? 55 : 30;
  return blocks.map((b, i) => ({
    ...b,
    x: b.x ?? 50,
    y: b.y ?? (startY + i * 4),
  }));
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
  textBlocks: TextBlock[];
  onTextBlocksChange: (blocks: TextBlock[]) => void;
  qrPosition: QrPosition;
  onQrPositionChange: (pos: QrPosition) => void;
  textColor: string;
  onTextColorChange: (color: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
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

const STYLE_LABELS: Record<TextBlockStyle, string> = {
  primary: 'Grande',
  secondary: 'Medio',
  tertiary: 'Piccolo',
};

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
  textBlocks,
  onTextBlocksChange,
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
  const [isQrDragging, setIsQrDragging] = useState(false);
  const [isQrResizing, setIsQrResizing] = useState(false);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const dragStartRef = useRef<{startX: number;startY: number;startTx: number;startTy: number;} | null>(null);
  const blockDragRef = useRef<{startX: number; startY: number; origX: number; origY: number} | null>(null);
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
    setDraggingBlockId(null);
    setIsQrDragging(false);
    setIsQrResizing(false);
    dragStartRef.current = null;
    blockDragRef.current = null;
    qrDragRef.current = null;
    qrResizeRef.current = null;
  }, []);

  // Block drag
  const handleBlockPointerDown = useCallback((e: React.PointerEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingBlockId(blockId);
    setSelectedBlockId(blockId);
    const block = textBlocks.find(b => b.id === blockId);
    if (block) {
      blockDragRef.current = { startX: e.clientX, startY: e.clientY, origX: block.x, origY: block.y };
    }
  }, [textBlocks]);

  // QR drag
  const handleQrPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsQrDragging(true);
    setSelectedBlockId(null);
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

  // Unified pointer move for block/QR drag on the preview container
  const handlePreviewPointerMove = useCallback((e: React.PointerEvent) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();

    if (draggingBlockId && blockDragRef.current) {
      e.preventDefault();
      const dx = ((e.clientX - blockDragRef.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - blockDragRef.current.startY) / rect.height) * 100;
      let newX = Math.max(5, Math.min(95, blockDragRef.current.origX + dx));
      let newY = Math.max(2, Math.min(95, blockDragRef.current.origY + dy));
      // snap to center X
      if (Math.abs(newX - 50) < 2) newX = 50;
      onTextBlocksChange(textBlocks.map(b => b.id === draggingBlockId ? { ...b, x: newX, y: newY } : b));
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
  }, [draggingBlockId, isQrDragging, isQrResizing, qrPosition, onTextBlocksChange, onQrPositionChange, textBlocks]);

  const showGuideH = isDragging && Math.abs(imageTransform.y) < SNAP_THRESHOLD;
  const showGuideV = isDragging && Math.abs(imageTransform.x) < SNAP_THRESHOLD;

  const fontFamily = FONT_MAP[fontStyle];

  // --- Block manipulation ---
  const updateBlockValue = (id: string, value: string) => {
    onTextBlocksChange(textBlocks.map(b => b.id === id ? { ...b, value } : b));
  };

  const updateBlockLabel = (id: string, label: string) => {
    onTextBlocksChange(textBlocks.map(b => b.id === id ? { ...b, label } : b));
  };

  const updateBlockStyle = (id: string, style: TextBlockStyle) => {
    onTextBlocksChange(textBlocks.map(b => b.id === id ? { ...b, style } : b));
  };

  const updateBlockFont = (id: string, font: FontStyle | undefined) => {
    onTextBlocksChange(textBlocks.map(b => b.id === id ? { ...b, fontOverride: font } : b));
  };

  const updateBlockColor = (id: string, color: string | undefined) => {
    onTextBlocksChange(textBlocks.map(b => b.id === id ? { ...b, colorOverride: color } : b));
  };

  const removeBlock = (id: string) => {
    onTextBlocksChange(textBlocks.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    const idx = textBlocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= textBlocks.length) return;
    const arr = [...textBlocks];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    onTextBlocksChange(arr);
  };

  const addCustomBlock = () => {
    const newBlock: TextBlock = {
      id: makeBlockId(),
      type: 'custom',
      label: 'Campo personalizzato',
      value: '',
      style: 'secondary',
      x: 50,
      y: 50,
    };
    onTextBlocksChange([...textBlocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const selectedBlock = textBlocks.find(b => b.id === selectedBlockId);

  // Deselect when clicking the preview background
  const handlePreviewBgClick = useCallback(() => {
    setSelectedBlockId(null);
  }, []);

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
          <Label>Stile Font (globale)</Label>
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
          <Label>Colore testo (globale)</Label>
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

        {/* Selected block controls */}
        {selectedBlock && (
          <div className="space-y-3 pt-3 border-t border-primary/30 bg-primary/5 -mx-4 md:-mx-6 px-4 md:px-6 pb-3">
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary">
                Elemento selezionato
              </h3>
              <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => setSelectedBlockId(null)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{selectedBlock.label}</p>

            {/* Per-block font override */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Type className="w-3 h-3" /> Font
              </Label>
              <Select
                value={selectedBlock.fontOverride || '__global__'}
                onValueChange={(v) => updateBlockFont(selectedBlock.id, v === '__global__' ? undefined : v as FontStyle)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">Usa globale</SelectItem>
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

            {/* Per-block color override */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Palette className="w-3 h-3" /> Colore
              </Label>
              <div className="flex gap-1.5 flex-wrap items-center">
                <button
                  onClick={() => updateBlockColor(selectedBlock.id, undefined)}
                  className={`h-7 px-2 text-[10px] rounded border transition-all ${
                    !selectedBlock.colorOverride ? "border-primary ring-1 ring-primary/30 bg-primary/10" : "border-border"
                  }`}
                >
                  Globale
                </button>
                {TEXT_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => updateBlockColor(selectedBlock.id, preset.value)}
                    className={`w-7 h-7 rounded border-2 transition-all ${
                      selectedBlock.colorOverride === preset.value ? "border-primary ring-1 ring-primary/30" : "border-border"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  />
                ))}
                <Input
                  type="color"
                  value={selectedBlock.colorOverride || textColor}
                  onChange={(e) => updateBlockColor(selectedBlock.id, e.target.value)}
                  className="w-7 h-7 p-0.5 cursor-pointer rounded"
                />
              </div>
            </div>

            {/* Per-block size */}
            <div className="space-y-1">
              <Label className="text-xs">Dimensione</Label>
              <Select value={selectedBlock.style} onValueChange={(v) => updateBlockStyle(selectedBlock.id, v as TextBlockStyle)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STYLE_LABELS) as TextBlockStyle[]).map(s => (
                    <SelectItem key={s} value={s}>{STYLE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Text input for selected block */}
            <div className="space-y-1">
              <Label className="text-xs">Testo</Label>
              <Input
                value={selectedBlock.value}
                onChange={(e) => updateBlockValue(selectedBlock.id, e.target.value)}
                className="h-8 text-xs"
                placeholder="Testo..."
              />
            </div>

            {selectedBlock.type === 'custom' && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => removeBlock(selectedBlock.id)}
              >
                <X className="w-3 h-3 mr-1" /> Rimuovi casella
              </Button>
            )}
          </div>
        )}

        {/* Editable text blocks */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Testi dell'invito</h3>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={addCustomBlock}
            >
              <Plus className="w-3.5 h-3.5" />
              Aggiungi casella
            </Button>
          </div>

          {textBlocks.map((block, idx) => (
            <div key={block.id}>
              <div
                className={`group relative rounded-lg border p-2 space-y-1.5 bg-background cursor-pointer transition-colors ${
                  selectedBlockId === block.id ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedBlockId(block.id)}
              >
                {/* Header row: label + controls */}
                <div className="flex items-center gap-1">
                  <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  {block.type === 'custom' ? (
                    <Input
                      value={block.label}
                      onChange={(e) => updateBlockLabel(block.id, e.target.value)}
                      className="h-6 text-xs px-1 flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent font-medium"
                      placeholder="Etichetta campo"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground flex-1 truncate">{block.label}</span>
                  )}
                  {/* Overrides indicator */}
                  {(block.fontOverride || block.colorOverride) && (
                    <span className="text-[9px] text-primary bg-primary/10 px-1 rounded">stile</span>
                  )}
                  {/* Move up/down */}
                  <Button
                    variant="ghost" size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); moveBlock(block.id, -1); }}
                    disabled={idx === 0}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 1); }}
                    disabled={idx === textBlocks.length - 1}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  {block.type === 'custom' && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-5 w-5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {/* Value input */}
                <Input
                  value={block.value}
                  onChange={(e) => updateBlockValue(block.id, e.target.value)}
                  className="h-7 text-xs"
                  placeholder={block.type === 'greeting' ? 'Cari' : 'Testo...'}
                  onClick={(e) => e.stopPropagation()}
                />
                {block.type === 'greeting' && (
                  <p className="text-[10px] text-muted-foreground">
                    💡 Nel PDF il saluto si adatta automaticamente al nucleo.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Position controls */}
        <div className="space-y-3 pt-2 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            Codice QR
          </h3>
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
            <p className="text-[10px] text-muted-foreground">Trascina il QR code e le caselle testo nell'anteprima per spostarli</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              onQrPositionChange({ x: 42, y: 85, size: 15 });
            }}
          >
            <RotateCcw className="w-3 h-3 mr-2" />
            Ripristina posizione QR
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
          }}
          onClick={handlePreviewBgClick}
        >
          
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

          {/* Individual text blocks — each draggable */}
          {textBlocks.map((block) => {
            if (!block.value && block.type !== 'greeting') return null;
            const blockFont = block.fontOverride ? FONT_MAP[block.fontOverride] : fontFamily;
            const blockColor = block.colorOverride || textColor;
            const { className, style } = getBlockPreviewStyle(block, blockFont, blockColor);
            const isSelected = selectedBlockId === block.id;
            const isBeingDragged = draggingBlockId === block.id;

            return (
              <div
                key={block.id}
                className={`absolute z-10 text-center ${isSelected ? 'ring-2 ring-primary/50 rounded' : ''}`}
                style={{
                  left: `${block.x}%`,
                  top: `${block.y}%`,
                  transform: 'translateX(-50%)',
                  cursor: isBeingDragged ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  maxWidth: '90%',
                  padding: isSelected ? '2px 4px' : undefined,
                }}
                onPointerDown={(e) => handleBlockPointerDown(e, block.id)}
                onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
              >
                <p className={`pointer-events-none whitespace-nowrap ${className}`} style={style}>
                  {block.type === 'greeting' ? (
                    <>{block.value} <span className="font-semibold">Famiglia Rossi</span></>
                  ) : block.value}
                </p>
              </div>
            );
          })}

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

function getBlockPreviewStyle(block: TextBlock, blockFont: string, blockColor: string): { className: string; style: React.CSSProperties } {
  const mainColor = blockColor;
  const secondaryColor = blockColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : blockColor === '#1a1a1a' ? undefined : `${blockColor}99`;
  const tertiaryColor = blockColor === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : blockColor === '#1a1a1a' ? undefined : `${blockColor}77`;

  if (block.type !== 'custom') {
    switch (block.type) {
      case 'greeting':
        return {
          className: `text-xs tracking-wide ${!secondaryColor ? 'text-muted-foreground' : ''}`,
          style: { fontFamily: blockFont, color: secondaryColor },
        };
      case 'names':
        return {
          className: 'text-base md:text-lg font-semibold leading-tight',
          style: { fontFamily: blockFont, color: mainColor },
        };
      case 'announcement':
        return {
          className: `text-xs ${!secondaryColor ? 'text-muted-foreground' : ''}`,
          style: { fontFamily: blockFont, color: secondaryColor },
        };
      case 'dateText':
        return {
          className: 'text-sm font-medium capitalize',
          style: { fontFamily: blockFont, color: mainColor },
        };
      case 'timePrefix_time':
        return {
          className: `text-xs ${!secondaryColor ? 'text-muted-foreground' : ''}`,
          style: { fontFamily: blockFont, color: secondaryColor },
        };
      case 'venuePrefix':
      case 'receptionPrefix':
        return {
          className: `text-xs ${!secondaryColor ? 'text-muted-foreground' : ''}`,
          style: { fontFamily: blockFont, color: secondaryColor },
        };
      case 'ceremonyVenue':
      case 'receptionVenue':
        return {
          className: 'text-sm font-medium',
          style: { fontFamily: blockFont, color: mainColor },
        };
      case 'ceremonyAddress':
      case 'receptionAddress':
        return {
          className: `text-[10px] ${!tertiaryColor ? 'text-muted-foreground' : ''}`,
          style: { fontFamily: blockFont, color: tertiaryColor },
        };
      default:
        break;
    }
  }

  switch (block.style) {
    case 'primary':
      return {
        className: 'text-sm font-medium',
        style: { fontFamily: blockFont, color: mainColor },
      };
    case 'tertiary':
      return {
        className: `text-[10px] ${!tertiaryColor ? 'text-muted-foreground' : ''}`,
        style: { fontFamily: blockFont, color: tertiaryColor },
      };
    case 'secondary':
    default:
      return {
        className: `text-xs ${!secondaryColor ? 'text-muted-foreground' : ''}`,
        style: { fontFamily: blockFont, color: secondaryColor },
      };
  }
}

export default PrintDesignStep;
