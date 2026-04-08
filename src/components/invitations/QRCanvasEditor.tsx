import { useState, useRef, useCallback, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export interface QROverlayConfig {
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
  width: number; // percentage of canvas width
  color: string;
  quietZone: boolean;
}

interface QRCanvasEditorProps {
  previewImageUrl: string;
  config: QROverlayConfig;
  onChange: (config: QROverlayConfig) => void;
}

const COLOR_PRESETS = [
  { label: "Nero", value: "#000000" },
  { label: "Oro", value: "#C9A84C" },
  { label: "Bianco", value: "#FFFFFF" },
];

const MIN_QR_PCT = 8; // minimum width as % of canvas (~60px on 750px canvas)

const QRCanvasEditor = ({ previewImageUrl, config, onChange }: QRCanvasEditorProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [customColor, setCustomColor] = useState("");
  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeStartRef = useRef<{ startX: number; startY: number; origW: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: config.x,
      origY: config.y,
    };
  }, [config.x, config.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    if (isDragging && dragStartRef.current) {
      e.preventDefault();
      const dx = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100 - config.width, dragStartRef.current.origX + dx));
      const newY = Math.max(0, Math.min(100 - config.width, dragStartRef.current.origY + dy));
      onChange({ ...config, x: newX, y: newY });
    }

    if (isResizing && resizeStartRef.current) {
      e.preventDefault();
      const dx = ((e.clientX - resizeStartRef.current.startX) / rect.width) * 100;
      const newW = Math.max(MIN_QR_PCT, Math.min(40, resizeStartRef.current.origW + dx));
      onChange({ ...config, width: newW });
    }
  }, [isDragging, isResizing, config, onChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    dragStartRef.current = null;
    resizeStartRef.current = null;
  }, []);

  const handleResizeDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: config.width,
    };
  }, [config.width]);

  // Calculate QR size in the preview
  const isSelectedCustom = !COLOR_PRESETS.some(p => p.value === config.color);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-0">
      {/* Controls sidebar */}
      <div className="w-full lg:w-[280px] p-4 lg:p-6 space-y-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            Posiziona il QR Code
          </h3>
          <p className="text-xs text-muted-foreground">
            Trascina il riquadro QR sulla preview per posizionarlo. Usa l'angolo in basso a destra per ridimensionarlo.
          </p>
        </div>

        {/* Color picker */}
        <div className="space-y-3">
          <Label>Colore QR</Label>
          <div className="flex gap-2 flex-wrap">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onChange({ ...config, color: preset.value })}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  config.color === preset.value ? "border-primary ring-2 ring-primary/30" : "border-border"
                }`}
                style={{ backgroundColor: preset.value }}
                title={preset.label}
              />
            ))}
            {/* Custom color */}
            <div className="flex items-center gap-1.5">
              <Input
                type="color"
                value={isSelectedCustom ? config.color : "#000000"}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  onChange({ ...config, color: e.target.value });
                }}
                className="w-10 h-10 p-0.5 cursor-pointer rounded-lg"
                title="Colore personalizzato"
              />
            </div>
          </div>
        </div>

        {/* Quiet zone toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="quiet-zone">Bordo bianco (quiet zone)</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Migliora la leggibilità del QR
            </p>
          </div>
          <Switch
            id="quiet-zone"
            checked={config.quietZone}
            onCheckedChange={(v) => onChange({ ...config, quietZone: v })}
          />
        </div>

        {/* Size display */}
        <div className="space-y-1">
          <Label>Dimensione</Label>
          <p className="text-sm text-muted-foreground">{Math.round(config.width)}% della larghezza</p>
          {config.width <= MIN_QR_PCT && (
            <p className="text-[10px] text-[hsl(var(--status-overdue))]">
              Dimensione minima raggiunta (~1.5cm)
            </p>
          )}
        </div>

        {/* Reset button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onChange({ x: 50 - 7.5, y: 80, width: 15, color: "#000000", quietZone: true })}
        >
          Ripristina posizione
        </Button>
      </div>

      {/* Canvas preview */}
      <div
        className="flex-1 bg-muted/30 flex items-center justify-center p-4 lg:p-8 overflow-auto"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          ref={canvasRef}
          className="relative bg-white shadow-xl rounded-sm overflow-hidden select-none"
          style={{
            width: "100%",
            maxWidth: "500px",
            aspectRatio: "1 / 1.414",
            touchAction: "none",
          }}
        >
          {/* Background image */}
          <img
            src={previewImageUrl}
            alt="Template preview"
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />

          {/* QR Overlay placeholder */}
          <div
            className="absolute cursor-grab active:cursor-grabbing"
            style={{
              left: `${config.x}%`,
              top: `${config.y}%`,
              width: `${config.width}%`,
              aspectRatio: "1 / 1",
              touchAction: "none",
            }}
            onPointerDown={handlePointerDown}
          >
            {/* QR content */}
            <div
              className="w-full h-full flex items-center justify-center rounded-sm"
              style={{
                backgroundColor: config.quietZone ? "#ffffff" : "transparent",
                padding: config.quietZone ? "8%" : "0",
                border: "2px dashed hsl(var(--primary))",
              }}
            >
              <QRCodeSVG
                value="https://example.com/rsvp/preview"
                size={200}
                fgColor={config.color}
                bgColor="transparent"
                level="M"
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            {/* Resize handle */}
            <div
              className="absolute -right-1.5 -bottom-1.5 w-4 h-4 bg-primary rounded-full cursor-se-resize border-2 border-background shadow-sm"
              onPointerDown={handleResizeDown}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCanvasEditor;
