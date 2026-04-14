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
import { Upload, ImageIcon, RotateCcw, GripVertical, QrCode, Plus, Minus, X, ChevronUp, ChevronDown, Type, Palette, MousePointer, Undo2, Redo2, Group, Ungroup, AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Columns3, Rows3, AlignLeft, AlignCenter, AlignRight, ZoomIn } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import type { ImageTransform, EdgeStyle, QrPosition, PaperFormat, PaperOrientation } from "./PrintInvitationEditor";
import { PAPER_FORMATS, getPaperDimensions } from "./PrintInvitationEditor";

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
  groupId?: string;
  widthPct?: number; // % of canvas width — if set, text wraps
  lineHeight?: number; // e.g. 1.0, 1.2, 1.5 — only relevant when widthPct is set
  textAlign?: 'left' | 'center' | 'right';
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
  paperFormat: PaperFormat;
  onPaperFormatChange: (format: PaperFormat) => void;
  paperOrientation: PaperOrientation;
  onPaperOrientationChange: (orientation: PaperOrientation) => void;
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
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  paperFormat,
  onPaperFormatChange,
  paperOrientation,
  onPaperOrientationChange,
}: PrintDesignStepProps) => {
  const _weddingData = weddingDataProp ?? {
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
  const [isQrSelected, setIsQrSelected] = useState(false);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoRect, setLassoRect] = useState<{x1: number; y1: number; x2: number; y2: number} | null>(null);
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [clipboardBlockIds, setClipboardBlockIds] = useState<string[]>([]);
  const lassoStartRef = useRef<{startX: number; startY: number} | null>(null);
  const dragStartRef = useRef<{startX: number;startY: number;startTx: number;startTy: number;} | null>(null);
  const blockDragRef = useRef<{startX: number; startY: number; origPositions: Record<string, {x: number; y: number}>} | null>(null);
  const blockResizeRef = useRef<{startX: number; origWidth: number; blockId: string} | null>(null);
  
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
    setIsLassoing(false);
    setLassoRect(null);
    setResizingBlockId(null);
    dragStartRef.current = null;
    blockDragRef.current = null;
    blockResizeRef.current = null;
    qrDragRef.current = null;
    qrResizeRef.current = null;
    lassoStartRef.current = null;
  }, []);

  // Keyboard shortcuts for undo/redo + arrow keys for selected blocks + copy/paste
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) { onRedo(); } else { onUndo(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        onRedo();
      }

      // Ctrl+C — copy selected blocks
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isInput && selectedBlockIds.size > 0) {
        e.preventDefault();
        setClipboardBlockIds([...selectedBlockIds]);
      }

      // Ctrl+V — paste copied blocks
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isInput && clipboardBlockIds.length > 0) {
        e.preventDefault();
        const sourceBlocks = textBlocks.filter(b => clipboardBlockIds.includes(b.id));
        if (sourceBlocks.length === 0) return;
        const newBlocks: TextBlock[] = sourceBlocks.map(b => ({
          ...b,
          id: makeBlockId(),
          x: Math.min(95, b.x + 3),
          y: Math.min(95, b.y + 3),
          groupId: undefined, // don't copy group membership
        }));
        onTextBlocksChange([...textBlocks, ...newBlocks]);
        setSelectedBlockIds(new Set(newBlocks.map(b => b.id)));
      }

      // Arrow keys to move selected blocks or QR
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (isInput) return;
        
        // Move QR if selected (and no text blocks selected)
        if (isQrSelected && selectedBlockIds.size === 0) {
          e.preventDefault();
          const step = e.shiftKey ? 2 : 0.5;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          onQrPositionChange({
            ...qrPosition,
            x: Math.max(0, Math.min(100 - qrPosition.size, qrPosition.x + dx)),
            y: Math.max(0, Math.min(100 - qrPosition.size, qrPosition.y + dy)),
          });
          return;
        }

        if (selectedBlockIds.size > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 2 : 0.5;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          onTextBlocksChange(textBlocks.map(b => {
            if (!selectedBlockIds.has(b.id)) return b;
            return {
              ...b,
              x: Math.max(2, Math.min(98, b.x + dx)),
              y: Math.max(2, Math.min(98, b.y + dy)),
            };
          }));
          // Also move QR if it's selected alongside text blocks
          if (isQrSelected) {
            onQrPositionChange({
              ...qrPosition,
              x: Math.max(0, Math.min(100 - qrPosition.size, qrPosition.x + dx)),
              y: Math.max(0, Math.min(100 - qrPosition.size, qrPosition.y + dy)),
            });
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onUndo, onRedo, selectedBlockIds, textBlocks, onTextBlocksChange, isQrSelected, qrPosition, onQrPositionChange, clipboardBlockIds]);

  // Block drag — multi-select aware
  const handleBlockPointerDown = useCallback((e: React.PointerEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingBlockId(blockId);

    // Determine the effective selection for this drag
    let effectiveIds: Set<string>;

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Toggle this block in selection
      effectiveIds = new Set(selectedBlockIds);
      if (effectiveIds.has(blockId)) effectiveIds.delete(blockId); else effectiveIds.add(blockId);
      effectiveIds = expandSelectionForGroups(effectiveIds);
      setSelectedBlockIds(effectiveIds);
    } else if (selectedBlockIds.has(blockId)) {
      // Already selected — drag the whole group
      effectiveIds = selectedBlockIds;
    } else {
      // Not selected, no modifier — select only this one (+ its group)
      effectiveIds = expandSelectionForGroups(new Set([blockId]));
      setSelectedBlockIds(effectiveIds);
    }

    // Store original positions for all blocks in the effective selection
    const origPositions: Record<string, {x: number; y: number}> = {};
    textBlocks.forEach(b => {
      if (effectiveIds.has(b.id)) origPositions[b.id] = { x: b.x, y: b.y };
    });
    blockDragRef.current = { startX: e.clientX, startY: e.clientY, origPositions };
  }, [textBlocks, selectedBlockIds]);

  // QR drag
  const handleQrPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsQrDragging(true);
    setIsQrSelected(true);
    // With Shift/Ctrl, keep text block selection; otherwise clear it
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedBlockIds(new Set());
    }
    qrDragRef.current = { startX: e.clientX, startY: e.clientY, origX: qrPosition.x, origY: qrPosition.y };
  }, [qrPosition.x, qrPosition.y]);

  // Block resize
  const handleBlockResizeDown = useCallback((e: React.PointerEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const block = textBlocks.find(b => b.id === blockId);
    if (!block) return;
    setResizingBlockId(blockId);
    blockResizeRef.current = { startX: e.clientX, origWidth: block.widthPct ?? 0, blockId };
  }, [textBlocks]);

  // QR resize
  const handleQrResizeDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsQrResizing(true);
    qrResizeRef.current = { startX: e.clientX, origSize: qrPosition.size };
  }, [qrPosition.size]);

  // Unified pointer move for block/QR drag + lasso on the preview container
  const handlePreviewPointerMove = useCallback((e: React.PointerEvent) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();

    // Lasso drawing
    if (isLassoing && lassoStartRef.current) {
      e.preventDefault();
      const x2 = ((e.clientX - rect.left) / rect.width) * 100;
      const y2 = ((e.clientY - rect.top) / rect.height) * 100;
      setLassoRect(prev => prev ? { ...prev, x2: Math.max(0, Math.min(100, x2)), y2: Math.max(0, Math.min(100, y2)) } : null);

      // Live-select blocks within lasso rectangle
      if (lassoRect) {
        const lx1 = Math.min(lassoRect.x1, x2);
        const lx2 = Math.max(lassoRect.x1, x2);
        const ly1 = Math.min(lassoRect.y1, y2);
        const ly2 = Math.max(lassoRect.y1, y2);
        const withinIds = new Set<string>();
        textBlocks.forEach(b => {
          if (b.x >= lx1 && b.x <= lx2 && b.y >= ly1 && b.y <= ly2) {
            withinIds.add(b.id);
          }
        });
        setSelectedBlockIds(withinIds);
        // Also select QR if its center falls within lasso
        const qrCenterX = qrPosition.x + qrPosition.size / 2;
        const qrCenterY = qrPosition.y + qrPosition.size / 2;
        setIsQrSelected(qrCenterX >= lx1 && qrCenterX <= lx2 && qrCenterY >= ly1 && qrCenterY <= ly2);
      }
      return;
    }

    if (draggingBlockId && blockDragRef.current) {
      e.preventDefault();
      const dx = ((e.clientX - blockDragRef.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - blockDragRef.current.startY) / rect.height) * 100;

      // Move all blocks whose original positions are stored (group drag)
      const orig = blockDragRef.current.origPositions;
      onTextBlocksChange(textBlocks.map(b => {
        if (!orig[b.id]) return b;
        let newX = Math.max(5, Math.min(95, orig[b.id].x + dx));
        let newY = Math.max(2, Math.min(95, orig[b.id].y + dy));
        if (Math.abs(newX - 50) < 2) newX = 50;
        return { ...b, x: newX, y: newY };
      }));
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

    if (resizingBlockId && blockResizeRef.current) {
      e.preventDefault();
      const dx = ((e.clientX - blockResizeRef.current.startX) / rect.width) * 100;
      const newW = Math.max(10, Math.min(95, blockResizeRef.current.origWidth + dx));
      onTextBlocksChange(textBlocks.map(b => b.id === resizingBlockId ? { ...b, widthPct: newW } : b));
    }
  }, [draggingBlockId, isQrDragging, isQrResizing, isLassoing, lassoRect, qrPosition, onTextBlocksChange, onQrPositionChange, textBlocks, resizingBlockId]);

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
    setSelectedBlockIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
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
    setSelectedBlockIds(new Set([newBlock.id]));
  };

  // Apply bulk style changes to all selected blocks
  const updateSelectedBlocksFont = (font: FontStyle | undefined) => {
    onTextBlocksChange(textBlocks.map(b => selectedBlockIds.has(b.id) ? { ...b, fontOverride: font } : b));
  };
  const updateSelectedBlocksColor = (color: string | undefined) => {
    onTextBlocksChange(textBlocks.map(b => selectedBlockIds.has(b.id) ? { ...b, colorOverride: color } : b));
  };
  const updateSelectedBlocksStyle = (style: TextBlockStyle) => {
    onTextBlocksChange(textBlocks.map(b => selectedBlockIds.has(b.id) ? { ...b, style } : b));
  };

  // ── Grouping ──
  const groupSelected = () => {
    if (selectedBlockIds.size < 2) return;
    const gid = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    onTextBlocksChange(textBlocks.map(b => selectedBlockIds.has(b.id) ? { ...b, groupId: gid } : b));
  };

  const ungroupSelected = () => {
    onTextBlocksChange(textBlocks.map(b => selectedBlockIds.has(b.id) ? { ...b, groupId: undefined } : b));
  };

  const selectedHaveGroup = (() => {
    const sel = textBlocks.filter(b => selectedBlockIds.has(b.id));
    return sel.length > 0 && sel.every(b => b.groupId);
  })();

  // Auto-select group members on click
  const expandSelectionForGroups = useCallback((ids: Set<string>): Set<string> => {
    const expanded = new Set(ids);
    const groupIds = new Set<string>();
    textBlocks.forEach(b => { if (expanded.has(b.id) && b.groupId) groupIds.add(b.groupId); });
    if (groupIds.size > 0) {
      textBlocks.forEach(b => { if (b.groupId && groupIds.has(b.groupId)) expanded.add(b.id); });
    }
    return expanded;
  }, [textBlocks]);

  // ── Alignment & Distribution ──
  const getSelectedBlocks = () => textBlocks.filter(b => selectedBlockIds.has(b.id));

  const alignLeft = () => {
    const sel = getSelectedBlocks();
    if (sel.length < 2) return;
    const minX = Math.min(...sel.map(b => b.x));
    onTextBlocksChange(textBlocks.map(b => selectedBlockIds.has(b.id) ? { ...b, x: minX } : b));
  };
  const alignCenterH = () => {
    const sel = getSelectedBlocks();
    if (sel.length < 2) return;
    const avg = sel.reduce((s, b) => s + b.x, 0) / sel.length;
    onTextBlocksChange(textBlocks.map(b => selectedBlockIds.has(b.id) ? { ...b, x: avg } : b));
  };
  const alignRight = () => {
    const sel = getSelectedBlocks();
    if (sel.length < 2) return;
    const maxX = Math.max(...sel.map(b => b.x));
    onTextBlocksChange(textBlocks.map(b => selectedBlockIds.has(b.id) ? { ...b, x: maxX } : b));
  };
  const alignTop = () => {
    const sel = getSelectedBlocks();
    if (sel.length < 2) return;
    const minY = Math.min(...sel.map(b => b.y));
    onTextBlocksChange(textBlocks.map(b => selectedBlockIds.has(b.id) ? { ...b, y: minY } : b));
  };
  const alignCenterV = () => {
    const sel = getSelectedBlocks();
    if (sel.length < 2) return;
    const avg = sel.reduce((s, b) => s + b.y, 0) / sel.length;
    onTextBlocksChange(textBlocks.map(b => selectedBlockIds.has(b.id) ? { ...b, y: avg } : b));
  };
  const alignBottom = () => {
    const sel = getSelectedBlocks();
    if (sel.length < 2) return;
    const maxY = Math.max(...sel.map(b => b.y));
    onTextBlocksChange(textBlocks.map(b => selectedBlockIds.has(b.id) ? { ...b, y: maxY } : b));
  };
  const distributeH = () => {
    const sel = getSelectedBlocks();
    if (sel.length < 3) return;
    const sorted = [...sel].sort((a, b) => a.x - b.x);
    const minX = sorted[0].x;
    const maxX = sorted[sorted.length - 1].x;
    const step = (maxX - minX) / (sorted.length - 1);
    const posMap: Record<string, number> = {};
    sorted.forEach((b, i) => { posMap[b.id] = minX + i * step; });
    onTextBlocksChange(textBlocks.map(b => posMap[b.id] !== undefined ? { ...b, x: posMap[b.id] } : b));
  };
  const distributeV = () => {
    const sel = getSelectedBlocks();
    if (sel.length < 3) return;
    const sorted = [...sel].sort((a, b) => a.y - b.y);
    const minY = sorted[0].y;
    const maxY = sorted[sorted.length - 1].y;
    const step = (maxY - minY) / (sorted.length - 1);
    const posMap: Record<string, number> = {};
    sorted.forEach((b, i) => { posMap[b.id] = minY + i * step; });
    onTextBlocksChange(textBlocks.map(b => posMap[b.id] !== undefined ? { ...b, y: posMap[b.id] } : b));
  };

  const singleSelectedBlock = selectedBlockIds.size === 1
    ? textBlocks.find(b => selectedBlockIds.has(b.id)) ?? null
    : null;

  // Lasso start on preview background
  const handlePreviewBgPointerDown = useCallback((e: React.PointerEvent) => {
    // Only start lasso if clicking directly on the preview background (not on a block/QR)
    if (e.target !== e.currentTarget) return;
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setIsLassoing(true);
    setIsQrSelected(false);
    lassoStartRef.current = { startX: e.clientX, startY: e.clientY };
    setLassoRect({ x1: x, y1: y, x2: x, y2: y });
    // Deselect unless holding shift
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedBlockIds(new Set());
    }
  }, []);

  // Deselect when clicking the preview background (without dragging)
  const handlePreviewBgClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    // Only deselect if we didn't lasso (lasso handles its own selection)
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

        {/* Paper format */}
        <div className="space-y-2">
          <Label>Formato carta</Label>
          <Select value={paperFormat} onValueChange={(v) => onPaperFormatChange(v as PaperFormat)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PAPER_FORMATS) as PaperFormat[]).map(f => (
                <SelectItem key={f} value={f}>{PAPER_FORMATS[f].label} — {PAPER_FORMATS[f].mmLabel}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {paperFormat !== 'Square' && (
            <div className="flex gap-2">
              <Button
                variant={paperOrientation === 'portrait' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5"
                onClick={() => onPaperOrientationChange('portrait')}
              >
                <div className="w-3 h-4 border border-current rounded-[1px]" />
                Verticale
              </Button>
              <Button
                variant={paperOrientation === 'landscape' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5"
                onClick={() => onPaperOrientationChange('landscape')}
              >
                <div className="w-4 h-3 border border-current rounded-[1px]" />
                Orizzontale
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="safe-zone">Mostra margini di sicurezza</Label>
          <Switch
            id="safe-zone"
            checked={showSafeZone}
            onCheckedChange={onShowSafeZoneChange} />
        </div>

        {/* Undo/Redo buttons */}
        <div className="flex items-center gap-1 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 flex-1"
            onClick={onUndo}
            disabled={!canUndo}
            title="Annulla (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" /> Annulla
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 flex-1"
            onClick={onRedo}
            disabled={!canRedo}
            title="Ripristina (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" /> Ripristina
          </Button>
        </div>

        {/* Selected block controls — single selection */}
        {singleSelectedBlock && (
          <div className="space-y-3 pt-3 border-t border-primary/30 bg-primary/5 -mx-4 md:-mx-6 px-4 md:px-6 pb-3">
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-primary">
                Elemento selezionato
              </h3>
              <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => setSelectedBlockIds(new Set())}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{singleSelectedBlock.label}</p>

            {/* Per-block font override */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Type className="w-3 h-3" /> Font
              </Label>
              <Select
                value={singleSelectedBlock.fontOverride || '__global__'}
                onValueChange={(v) => updateBlockFont(singleSelectedBlock.id, v === '__global__' ? undefined : v as FontStyle)}
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
                  onClick={() => updateBlockColor(singleSelectedBlock.id, undefined)}
                  className={`h-7 px-2 text-[10px] rounded border transition-all ${
                    !singleSelectedBlock.colorOverride ? "border-primary ring-1 ring-primary/30 bg-primary/10" : "border-border"
                  }`}
                >
                  Globale
                </button>
                {TEXT_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => updateBlockColor(singleSelectedBlock.id, preset.value)}
                    className={`w-7 h-7 rounded border-2 transition-all ${
                      singleSelectedBlock.colorOverride === preset.value ? "border-primary ring-1 ring-primary/30" : "border-border"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  />
                ))}
                <Input
                  type="color"
                  value={singleSelectedBlock.colorOverride || textColor}
                  onChange={(e) => updateBlockColor(singleSelectedBlock.id, e.target.value)}
                  className="w-7 h-7 p-0.5 cursor-pointer rounded"
                />
              </div>
            </div>

            {/* Per-block size */}
            <div className="space-y-1">
              <Label className="text-xs">Dimensione</Label>
              <Select value={singleSelectedBlock.style} onValueChange={(v) => updateBlockStyle(singleSelectedBlock.id, v as TextBlockStyle)}>
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
                value={singleSelectedBlock.value}
                onChange={(e) => updateBlockValue(singleSelectedBlock.id, e.target.value)}
                className="h-8 text-xs"
                placeholder="Testo..."
              />
            </div>

            {singleSelectedBlock.type === 'custom' && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => removeBlock(singleSelectedBlock.id)}
              >
                <X className="w-3 h-3 mr-1" /> Rimuovi casella
              </Button>
            )}
          </div>
        )}

        {/* Multi-selection controls moved to toolbar above preview */}

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
                  selectedBlockIds.has(block.id) ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/50'
                }`}
                onClick={(e) => {
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    setSelectedBlockIds(prev => expandSelectionForGroups(new Set([...prev, block.id])));
                  } else {
                    setSelectedBlockIds(expandSelectionForGroups(new Set([block.id])));
                  }
                }}
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
            <p className="text-[10px] text-muted-foreground">Trascina il QR code e le caselle testo nell'anteprima per spostarli. Disegna un rettangolo sullo sfondo per selezionare più elementi (lazo).</p>
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
        className="flex-1 bg-muted/30 flex flex-col overflow-auto"
      >
        {/* Word-style floating toolbar above canvas */}
        {selectedBlockIds.size >= 1 && (
          <div className="flex-shrink-0 bg-background border-b border-border px-3 py-1.5 flex flex-wrap items-center gap-1.5">
            {/* Selection label */}
            <span className="text-xs font-medium text-muted-foreground mr-1">
              {selectedBlockIds.size === 1
                ? (textBlocks.find(b => selectedBlockIds.has(b.id))?.label ?? 'Elemento')
                : `${selectedBlockIds.size} elementi`}
            </span>
            <div className="w-px h-5 bg-border mx-0.5" />

            {/* Font selector */}
            <Select
              value={selectedBlockIds.size === 1
                ? (textBlocks.find(b => selectedBlockIds.has(b.id))?.fontOverride || '__global__')
                : '__bulk__'}
              onValueChange={(v) => {
                const font = v === '__global__' ? undefined : v as FontStyle;
                if (selectedBlockIds.size === 1) {
                  const id = [...selectedBlockIds][0];
                  updateBlockFont(id, font);
                } else {
                  updateSelectedBlocksFont(font);
                }
              }}
            >
              <SelectTrigger className="h-7 text-xs w-[130px] gap-1">
                <Type className="w-3 h-3 flex-shrink-0" />
                <SelectValue placeholder="Font..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__">Globale</SelectItem>
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

            {/* Size selector */}
            <Select
              value={selectedBlockIds.size === 1
                ? (textBlocks.find(b => selectedBlockIds.has(b.id))?.style || 'secondary')
                : '__bulk__'}
              onValueChange={(v) => {
                if (selectedBlockIds.size === 1) {
                  updateBlockStyle([...selectedBlockIds][0], v as TextBlockStyle);
                } else {
                  updateSelectedBlocksStyle(v as TextBlockStyle);
                }
              }}
            >
              <SelectTrigger className="h-7 text-xs w-[90px]">
                <SelectValue placeholder="Dimensione" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STYLE_LABELS) as TextBlockStyle[]).map(s => (
                  <SelectItem key={s} value={s}>{STYLE_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Line height — only for blocks with widthPct (wrapped text) */}
            {singleSelectedBlock?.widthPct && singleSelectedBlock.widthPct > 0 && (
              <>
                <div className="w-px h-5 bg-border mx-0.5" />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">Interlinea</span>
                  <Select
                    value={String(singleSelectedBlock.lineHeight ?? 1.4)}
                    onValueChange={(v) => {
                      onTextBlocksChange(textBlocks.map(b => b.id === singleSelectedBlock.id ? { ...b, lineHeight: parseFloat(v) } : b));
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-[65px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0].map(v => (
                        <SelectItem key={v} value={String(v)}>{v.toFixed(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Text alignment — left/center/right */}
            {selectedBlockIds.size >= 1 && (
              <>
                <div className="w-px h-5 bg-border mx-0.5" />
                {(['left', 'center', 'right'] as const).map(align => {
                  const labels = { left: 'Sinistra', center: 'Centro', right: 'Destra' };
                  const currentAlign = singleSelectedBlock?.textAlign ?? 'center';
                  return (
                    <Button
                      key={align}
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${selectedBlockIds.size === 1 && currentAlign === align ? 'bg-muted' : ''}`}
                      title={`Allinea testo: ${labels[align]}`}
                      onClick={() => {
                        onTextBlocksChange(textBlocks.map(b =>
                          selectedBlockIds.has(b.id) ? { ...b, textAlign: align } : b
                        ));
                      }}
                    >
                      {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                      {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                      {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                    </Button>
                  );
                })}
              </>
            )}

            <div className="w-px h-5 bg-border mx-0.5" />

            {/* Color presets */}
            {TEXT_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => {
                  if (selectedBlockIds.size === 1) {
                    updateBlockColor([...selectedBlockIds][0], preset.value);
                  } else {
                    updateSelectedBlocksColor(preset.value);
                  }
                }}
                className="w-6 h-6 rounded border border-border hover:ring-1 hover:ring-primary/40 transition-all flex-shrink-0"
                style={{ backgroundColor: preset.value }}
                title={preset.label}
              />
            ))}
            <button
              onClick={() => {
                if (selectedBlockIds.size === 1) {
                  updateBlockColor([...selectedBlockIds][0], undefined);
                } else {
                  updateSelectedBlocksColor(undefined);
                }
              }}
              className="h-6 px-1.5 text-[10px] rounded border border-border hover:bg-muted transition-colors flex-shrink-0"
              title="Usa colore globale"
            >
              Auto
            </button>

            {selectedBlockIds.size > 1 && (
              <>
                <div className="w-px h-5 bg-border mx-0.5" />

                {/* Alignment buttons — Horizontal (move X) */}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={alignLeft} title="Allinea a sinistra (stessa X)">
                  <AlignHorizontalJustifyStart className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={alignCenterH} title="Centra orizzontalmente (stessa X)">
                  <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={alignRight} title="Allinea a destra (stessa X)">
                  <AlignHorizontalJustifyEnd className="w-3.5 h-3.5" />
                </Button>

                {/* Alignment buttons — Vertical (move Y) */}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={alignTop} title="Allinea in alto (stessa Y)">
                  <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={alignCenterV} title="Centra verticalmente (stessa Y)">
                  <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={alignBottom} title="Allinea in basso (stessa Y)">
                  <AlignVerticalJustifyEnd className="w-3.5 h-3.5" />
                </Button>

                {/* Distribution */}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={distributeH} title="Distribuisci orizzontalmente" disabled={selectedBlockIds.size < 3}>
                  <Columns3 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={distributeV} title="Distribuisci verticalmente" disabled={selectedBlockIds.size < 3}>
                  <Rows3 className="w-3.5 h-3.5" />
                </Button>

                <div className="w-px h-5 bg-border mx-0.5" />

                {/* Group / Ungroup */}
                {!selectedHaveGroup ? (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={groupSelected}>
                    <Group className="w-3.5 h-3.5" /> Raggruppa
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={ungroupSelected}>
                    <Ungroup className="w-3.5 h-3.5" /> Separa
                  </Button>
                )}
              </>
            )}

            <div className="ml-auto">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedBlockIds(new Set())} title="Deseleziona">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div
          className="flex-1 flex items-center justify-center p-4 md:p-8"
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
            aspectRatio: `${getPaperDimensions(paperFormat, paperOrientation).w} / ${getPaperDimensions(paperFormat, paperOrientation).h}`,
            fontFamily,
            touchAction: 'none',
          }}
          onClick={handlePreviewBgClick}
          onPointerDown={handlePreviewBgPointerDown}
        >
          {/* Lasso selection rectangle */}
          {isLassoing && lassoRect && (
            <div
              className="absolute z-30 pointer-events-none"
              style={{
                left: `${Math.min(lassoRect.x1, lassoRect.x2)}%`,
                top: `${Math.min(lassoRect.y1, lassoRect.y2)}%`,
                width: `${Math.abs(lassoRect.x2 - lassoRect.x1)}%`,
                height: `${Math.abs(lassoRect.y2 - lassoRect.y1)}%`,
                border: '2px dashed hsl(var(--primary))',
                backgroundColor: 'hsl(var(--primary) / 0.08)',
                borderRadius: '2px',
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

          {/* Individual text blocks — each draggable + resizable */}
          {textBlocks.map((block) => {
            if (!block.value && block.type !== 'greeting') return null;
            const blockFont = block.fontOverride ? FONT_MAP[block.fontOverride] : fontFamily;
            const blockColor = block.colorOverride || textColor;
            const { className, style } = getBlockPreviewStyle(block, blockFont, blockColor);
            const isSelected = selectedBlockIds.has(block.id);
            const isBeingDragged = draggingBlockId === block.id;
            const hasWidth = block.widthPct && block.widthPct > 0;

            return (
              <div
                key={block.id}
                className={`absolute z-10 ${isSelected ? 'ring-2 ring-primary/50 rounded' : ''} ${block.groupId && !isSelected ? 'ring-1 ring-primary/20 rounded' : ''}`}
                style={{
                  left: `${block.x}%`,
                  top: `${block.y}%`,
                  transform: 'translateX(-50%)',
                  cursor: isBeingDragged ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  textAlign: block.textAlign || 'center',
                  width: hasWidth ? `${block.widthPct}%` : undefined,
                  maxWidth: hasWidth ? undefined : '90%',
                  padding: isSelected ? '2px 4px' : undefined,
                }}
                onPointerDown={(e) => handleBlockPointerDown(e, block.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsQrSelected(false);
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    setSelectedBlockIds(prev => expandSelectionForGroups(new Set([...prev, block.id])));
                  } else {
                    setSelectedBlockIds(expandSelectionForGroups(new Set([block.id])));
                  }
                }}
              >
                <p className={`pointer-events-none ${hasWidth ? 'whitespace-normal break-words' : 'whitespace-nowrap'} ${className}`} style={{ ...style, ...(hasWidth && block.lineHeight ? { lineHeight: block.lineHeight } : {}) }}>
                  {block.type === 'greeting' ? (
                    <>{block.value} <span className="font-semibold">Famiglia Rossi</span></>
                  ) : block.value}
                </p>
                {/* Resize handle — right edge */}
                {isSelected && (
                  <div
                    className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-6 bg-primary rounded-full cursor-ew-resize border-2 border-background shadow-sm z-20"
                    onPointerDown={(e) => handleBlockResizeDown(e, block.id)}
                  />
                )}
              </div>
            );
          })}

          {/* QR Code overlay — draggable + resizable */}
          <div
            className={`absolute z-10 ${isQrSelected ? 'ring-2 ring-primary/50 rounded' : ''}`}
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
                border: isQrSelected ? '2px dashed hsl(var(--primary))' : 'none',
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
            {/* Resize handle — only when selected */}
            {isQrSelected && (
              <div
                className="absolute -right-1.5 -bottom-1.5 w-4 h-4 bg-primary rounded-full cursor-se-resize border-2 border-background shadow-sm z-20"
                onPointerDown={handleQrResizeDown}
              />
            )}
          </div>
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
