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
import { FONT_MAP, type FontStyle } from "@/components/print/PrintDesignStep";
import type { ImageTransform, EdgeStyle } from "@/components/print/PrintInvitationEditor";
import type { MenuData } from "./MenuComposer";

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

export type MenuFormat = 'a5' | 'a6';

interface MenuDesignStepProps {
  backgroundImage: string | null;
  onBackgroundChange: (url: string | null) => void;
  fontStyle: FontStyle;
  onFontStyleChange: (style: FontStyle) => void;
  showSafeZone: boolean;
  onShowSafeZoneChange: (show: boolean) => void;
  menuData: MenuData;
  partnerNames: string;
  imageTransform: ImageTransform;
  onImageTransformChange: (t: ImageTransform) => void;
  edgeStyle: EdgeStyle;
  onEdgeStyleChange: (s: EdgeStyle) => void;
  menuFormat: MenuFormat;
  onMenuFormatChange: (f: MenuFormat) => void;
}

const SNAP_THRESHOLD = 2;

const MenuDesignStep = ({
  backgroundImage,
  onBackgroundChange,
  fontStyle,
  onFontStyleChange,
  showSafeZone,
  onShowSafeZoneChange,
  menuData,
  partnerNames,
  imageTransform,
  onImageTransformChange,
  edgeStyle,
  onEdgeStyleChange,
  menuFormat,
  onMenuFormatChange,
}: MenuDesignStepProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ix: number; iy: number } | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ h: boolean; v: boolean }>({ h: false, v: false });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onBackgroundChange(url);
    onImageTransformChange({ x: 0, y: 0, scale: 1 });
  };

  const removeBackground = () => {
    onBackgroundChange(null);
    onImageTransformChange({ x: 0, y: 0, scale: 1 });
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!backgroundImage) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ix: imageTransform.x, iy: imageTransform.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [backgroundImage, imageTransform]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = ((e.clientX - dragStart.current.x) / (previewRef.current?.clientWidth || 300)) * 100;
    const dy = ((e.clientY - dragStart.current.y) / (previewRef.current?.clientHeight || 400)) * 100;
    let newX = Math.max(-50, Math.min(50, dragStart.current.ix + dx));
    let newY = Math.max(-50, Math.min(50, dragStart.current.iy + dy));
    const hSnap = Math.abs(newX) < SNAP_THRESHOLD;
    const vSnap = Math.abs(newY) < SNAP_THRESHOLD;
    if (hSnap) newX = 0;
    if (vSnap) newY = 0;
    setSnapGuides({ h: hSnap, v: vSnap });
    onImageTransformChange({ ...imageTransform, x: newX, y: newY });
  }, [dragging, imageTransform, onImageTransformChange]);

  const onPointerUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
    setSnapGuides({ h: false, v: false });
  }, []);

  const fontFamily = FONT_MAP[fontStyle];
  const aspectRatio = menuFormat === 'a5' ? '148 / 210' : '105 / 148';

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar controls */}
      <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border p-4 space-y-5 overflow-y-auto">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        {/* Format */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Formato</Label>
          <Select value={menuFormat} onValueChange={(v) => onMenuFormatChange(v as MenuFormat)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="a5">A5 — Menu da Tavolo</SelectItem>
              <SelectItem value="a6">A6 — Segnaposto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Background */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Foto / Sfondo</Label>
          {backgroundImage ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => fileRef.current?.click()}>
                <ImageIcon className="w-4 h-4 mr-1" /> Cambia
              </Button>
              <Button variant="outline" size="sm" onClick={removeBackground}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Carica immagine
            </Button>
          )}
        </div>

        {/* Scale */}
        {backgroundImage && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Scala immagine</Label>
            <Slider
              value={[imageTransform.scale * 100]}
              onValueChange={([v]) => onImageTransformChange({ ...imageTransform, scale: v / 100 })}
              min={20} max={250} step={1}
            />
            <span className="text-xs text-muted-foreground">{Math.round(imageTransform.scale * 100)}%</span>
          </div>
        )}

        {/* Edge style */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Effetto bordo foto</Label>
          <Select value={edgeStyle} onValueChange={(v) => onEdgeStyleChange(v as EdgeStyle)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nessuno</SelectItem>
              <SelectItem value="soft">Sfumato (gradiente)</SelectItem>
              <SelectItem value="watercolor">Acquerello</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Font */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Font</Label>
          <Select value={fontStyle} onValueChange={(v) => onFontStyleChange(v as FontStyle)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(FONT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Safe zone */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Mostra zona sicura</Label>
          <Switch checked={showSafeZone} onCheckedChange={onShowSafeZoneChange} />
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 flex items-center justify-center p-4 bg-muted/20 overflow-auto">
        <div
          ref={previewRef}
          className="relative bg-white shadow-lg overflow-hidden"
          style={{
            aspectRatio,
            width: 'min(100%, 320px)',
            fontFamily,
            cursor: backgroundImage ? 'grab' : 'default',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Photo top 40% */}
          <div className="absolute top-0 left-0 right-0" style={{ height: '40%', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
            {backgroundImage ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  ...(edgeStyle === 'watercolor' ? {
                    WebkitMaskImage: 'url(/images/watercolor-mask.png)',
                    maskImage: 'url(/images/watercolor-mask.png)',
                    WebkitMaskSize: 'cover',
                    maskSize: 'cover' as any,
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat' as any,
                  } : edgeStyle === 'soft' ? {
                    WebkitMaskImage: 'radial-gradient(ellipse 85% 80% at 50% 45%, black 50%, transparent 95%)',
                    maskImage: 'radial-gradient(ellipse 85% 80% at 50% 45%, black 50%, transparent 95%)',
                  } : {}),
                }}
              >
                <img
                  src={backgroundImage}
                  alt=""
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${imageTransform.x}%), calc(-50% + ${imageTransform.y}%)) scale(${imageTransform.scale})`,
                    minWidth: '100%',
                    minHeight: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                <ImageIcon className="w-12 h-12" />
              </div>
            )}
            {/* Snap guides */}
            {snapGuides.h && <div className="absolute top-0 bottom-0 left-1/2 w-px bg-red-500/60 z-10" />}
            {snapGuides.v && <div className="absolute left-0 right-0 top-1/2 h-px bg-red-500/60 z-10" />}
          </div>

          {/* Text bottom 60% */}
          <div
            className="absolute left-0 right-0 bottom-0 flex flex-col items-center justify-start text-center"
            style={{ height: '60%', padding: '4% 6% 3%' }}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#999] mb-1">{menuData.title}</p>
            <div className="w-8 h-px bg-[#ccc] mb-2" />

            <div className="flex-1 overflow-hidden w-full space-y-1.5">
              {menuData.courses.filter(c => c.items.length > 0).map((course) => (
                <div key={course.id}>
                  <p className="text-[7px] uppercase tracking-[0.15em] text-[#aaa] font-semibold">{course.category}</p>
                  {course.items.map((item, i) => (
                    <p key={i} className="text-[8px] text-[#444] leading-tight">{item}</p>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-auto pt-1">
              <div className="w-6 h-px bg-[#ddd] mx-auto mb-1" />
              <p className="text-[7px] text-[#bbb]">{partnerNames}</p>
            </div>
          </div>

          {/* Safe zone */}
          {showSafeZone && (
            <div className="absolute inset-[5%] border border-dashed border-red-400/50 rounded pointer-events-none z-20" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuDesignStep;
