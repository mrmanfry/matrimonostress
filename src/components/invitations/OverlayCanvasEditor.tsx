import { useState, useRef, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QrCode, Type, User, Users, Home, Info } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { FONT_MAP, type FontStyle } from "@/components/print/PrintDesignStep";
import {
  generateGreetingString,
  type GreetingType,
  type MockParty,
} from "@/lib/greetingEngine";

// Re-export for backward compat
export type { QROverlayConfig } from "./QRCanvasEditor";

export interface GreetingOverlayConfig {
  x: number;
  y: number;
  width: number;
  fontStyle: FontStyle;
  fontSize: number;
  color: string;
  greetingType: GreetingType;
  customGreeting?: string;
  useAka: boolean;
}

export const DEFAULT_GREETING_CONFIG: GreetingOverlayConfig = {
  x: 25,
  y: 65,
  width: 50,
  fontStyle: "greatvibes",
  fontSize: 28,
  color: "#000000",
  greetingType: "informal",
  useAka: false,
};

interface QROverlayConfig {
  x: number;
  y: number;
  width: number;
  color: string;
  quietZone: boolean;
}

interface OverlayCanvasEditorProps {
  previewImageUrl: string;
  qrConfig: QROverlayConfig;
  onQrChange: (config: QROverlayConfig) => void;
  greetingConfig: GreetingOverlayConfig | null;
  onGreetingChange: (config: GreetingOverlayConfig | null) => void;
}

const QR_COLOR_PRESETS = [
  { label: "Nero", value: "#000000" },
  { label: "Oro", value: "#C9A84C" },
  { label: "Bianco", value: "#FFFFFF" },
];

const TEXT_COLOR_PRESETS = [
  { label: "Nero", value: "#000000" },
  { label: "Oro", value: "#C9A84C" },
  { label: "Bianco", value: "#FFFFFF" },
  { label: "Bordeaux", value: "#800020" },
];

const MIN_QR_PCT = 8;
const MIN_GREETING_PCT = 15;

const FONT_GROUPS: { label: string; fonts: { key: FontStyle; label: string }[] }[] = [
  {
    label: "Calligrafici",
    fonts: [
      { key: "bettersaturday", label: "Better Saturday ✦" },
      { key: "dancing", label: "Dancing Script" },
      { key: "greatvibes", label: "Great Vibes" },
      { key: "alex", label: "Alex Brush" },
      { key: "pinyon", label: "Pinyon Script" },
    ],
  },
  {
    label: "Classici",
    fonts: [
      { key: "garamond", label: "EB Garamond" },
      { key: "cormorant", label: "Cormorant" },
      { key: "playfair", label: "Playfair Display" },
      { key: "lora", label: "Lora" },
      { key: "cinzel", label: "Cinzel" },
    ],
  },
  {
    label: "Moderni",
    fonts: [
      { key: "lato", label: "Lato" },
      { key: "montserrat", label: "Montserrat" },
      { key: "raleway", label: "Raleway" },
      { key: "poppins", label: "Poppins" },
    ],
  },
];

const STRESS_MOCKS: Record<string, { label: string; icon: React.ReactNode; party: MockParty }> = {
  single: {
    label: "Singolo",
    icon: <User className="w-3.5 h-3.5" />,
    party: {
      isNucleo: false,
      members: [{ name: "Marco", lastName: "Rossi", gender: "M" as const }],
    },
  },
  couple: {
    label: "Coppia",
    icon: <Users className="w-3.5 h-3.5" />,
    party: {
      isNucleo: false,
      members: [
        { name: "Marco", lastName: "Rossi", gender: "M" as const },
        { name: "Giulia", lastName: "Bianchi", gender: "F" as const },
      ],
    },
  },
  nucleus: {
    label: "Nucleo",
    icon: <Home className="w-3.5 h-3.5" />,
    party: {
      isNucleo: true,
      nucleusName: "Famiglia Rossi",
      members: [
        { name: "Marco", lastName: "Rossi", gender: "M" as const },
        { name: "Giulia", lastName: "Rossi", gender: "F" as const },
        { name: "Luca", lastName: "Rossi", gender: "M" as const },
      ],
    },
  },
};

const GREETING_TYPE_OPTIONS: { value: GreetingType; label: string }[] = [
  { value: "informal", label: "Informale (Caro/a/i)" },
  { value: "formal", label: "Formale (Gentile/i)" },
  { value: "none", label: "Nessuno (solo nome)" },
  { value: "custom", label: "Personalizzato" },
];

type ActiveObject = "qr" | "greeting";

const OverlayCanvasEditor = ({
  previewImageUrl,
  qrConfig,
  onQrChange,
  greetingConfig,
  onGreetingChange,
}: OverlayCanvasEditorProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeObject, setActiveObject] = useState<ActiveObject>("qr");
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [stressMode, setStressMode] = useState<string>("single");

  const dragStartRef = useRef<{
    obj: ActiveObject;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizeStartRef = useRef<{
    obj: ActiveObject;
    startX: number;
    startY: number;
    origW: number;
  } | null>(null);

  // Greeting preview text
  const greetingPreviewText = greetingConfig
    ? generateGreetingString({
        greetingType: greetingConfig.greetingType,
        customGreeting: greetingConfig.customGreeting,
        useAka: greetingConfig.useAka,
        party: STRESS_MOCKS[stressMode].party,
      }).full
    : "";

  // --- Drag handlers ---
  const handlePointerDown = useCallback(
    (obj: ActiveObject) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      setActiveObject(obj);
      const config = obj === "qr" ? qrConfig : greetingConfig!;
      dragStartRef.current = {
        obj,
        startX: e.clientX,
        startY: e.clientY,
        origX: config.x,
        origY: config.y,
      };
    },
    [qrConfig, greetingConfig]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();

      if (isDragging && dragStartRef.current) {
        e.preventDefault();
        const { obj, startX, startY, origX, origY } = dragStartRef.current;
        const dx = ((e.clientX - startX) / rect.width) * 100;
        const dy = ((e.clientY - startY) / rect.height) * 100;
        const config = obj === "qr" ? qrConfig : greetingConfig!;
        const newX = Math.max(0, Math.min(100 - config.width, origX + dx));
        const newY = Math.max(0, Math.min(95, origY + dy));
        if (obj === "qr") {
          onQrChange({ ...qrConfig, x: newX, y: newY });
        } else {
          onGreetingChange({ ...greetingConfig!, x: newX, y: newY });
        }
      }

      if (isResizing && resizeStartRef.current) {
        e.preventDefault();
        const { obj, startX, origW } = resizeStartRef.current;
        const dx = ((e.clientX - startX) / rect.width) * 100;
        if (obj === "qr") {
          const newW = Math.max(MIN_QR_PCT, Math.min(40, origW + dx));
          onQrChange({ ...qrConfig, width: newW });
        } else {
          const newW = Math.max(MIN_GREETING_PCT, Math.min(80, origW + dx));
          onGreetingChange({ ...greetingConfig!, width: newW });
        }
      }
    },
    [isDragging, isResizing, qrConfig, greetingConfig, onQrChange, onGreetingChange]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    dragStartRef.current = null;
    resizeStartRef.current = null;
  }, []);

  const handleResizeDown = useCallback(
    (obj: ActiveObject) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsResizing(true);
      setActiveObject(obj);
      const config = obj === "qr" ? qrConfig : greetingConfig!;
      resizeStartRef.current = {
        obj,
        startX: e.clientX,
        startY: e.clientY,
        origW: config.width,
      };
    },
    [qrConfig, greetingConfig]
  );

  const isQrCustomColor = !QR_COLOR_PRESETS.some((p) => p.value === qrConfig.color);
  const isGreetingCustomColor =
    greetingConfig && !TEXT_COLOR_PRESETS.some((p) => p.value === greetingConfig.color);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-0">
      {/* Sidebar */}
      <div className="w-full lg:w-[300px] p-4 lg:p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-border">
        <Tabs value={activeObject} onValueChange={(v) => setActiveObject(v as ActiveObject)}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="qr" className="flex-1 gap-1.5">
              <QrCode className="w-3.5 h-3.5" /> QR Code
            </TabsTrigger>
            <TabsTrigger value="greeting" className="flex-1 gap-1.5">
              <Type className="w-3.5 h-3.5" /> Saluto
            </TabsTrigger>
          </TabsList>

          {/* --- QR Tab --- */}
          <TabsContent value="qr" className="space-y-5 mt-0">
            <p className="text-xs text-muted-foreground">
              Trascina il QR sulla preview. Usa l'angolo per ridimensionarlo.
            </p>

            <div className="space-y-3">
              <Label>Colore QR</Label>
              <div className="flex gap-2 flex-wrap">
                {QR_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => onQrChange({ ...qrConfig, color: preset.value })}
                    className={`w-9 h-9 rounded-lg border-2 transition-all ${
                      qrConfig.color === preset.value
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  />
                ))}
                <Input
                  type="color"
                  value={isQrCustomColor ? qrConfig.color : "#000000"}
                  onChange={(e) => onQrChange({ ...qrConfig, color: e.target.value })}
                  className="w-9 h-9 p-0.5 cursor-pointer rounded-lg"
                  title="Colore personalizzato"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="quiet-zone">Quiet zone</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Bordo bianco per leggibilità
                </p>
              </div>
              <Switch
                id="quiet-zone"
                checked={qrConfig.quietZone}
                onCheckedChange={(v) => onQrChange({ ...qrConfig, quietZone: v })}
              />
            </div>

            <div className="space-y-1">
              <Label>Dimensione</Label>
              <p className="text-sm text-muted-foreground">{Math.round(qrConfig.width)}%</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                onQrChange({ x: 42.5, y: 82, width: 15, color: "#000000", quietZone: true })
              }
            >
              Ripristina posizione
            </Button>
          </TabsContent>

          {/* --- Greeting Tab --- */}
          <TabsContent value="greeting" className="space-y-5 mt-0">
            {!greetingConfig ? (
              <div className="text-center space-y-3 py-4">
                <Type className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Aggiungi una casella di saluto personalizzato sopra il tuo design.
                </p>
                <Button
                  size="sm"
                  onClick={() => onGreetingChange(DEFAULT_GREETING_CONFIG)}
                >
                  Aggiungi Saluto
                </Button>
              </div>
            ) : (
              <>
                {/* Greeting type */}
                <div className="space-y-2">
                  <Label>Formula di saluto</Label>
                  <Select
                    value={greetingConfig.greetingType}
                    onValueChange={(v) =>
                      onGreetingChange({ ...greetingConfig, greetingType: v as GreetingType })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GREETING_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom greeting input */}
                {greetingConfig.greetingType === "custom" && (
                  <div className="space-y-1.5">
                    <Label>Testo personalizzato</Label>
                    <Input
                      value={greetingConfig.customGreeting || ""}
                      onChange={(e) =>
                        onGreetingChange({ ...greetingConfig, customGreeting: e.target.value })
                      }
                      placeholder="Es: Con affetto"
                    />
                  </div>
                )}

                {/* AKA toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="use-aka">Usa soprannome (AKA)</Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Usa l'alias se disponibile
                    </p>
                  </div>
                  <Switch
                    id="use-aka"
                    checked={greetingConfig.useAka}
                    onCheckedChange={(v) => onGreetingChange({ ...greetingConfig, useAka: v })}
                  />
                </div>

                {/* Info alert */}
                <div className="flex gap-2 p-2.5 rounded-md bg-primary/5 border border-primary/20">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground">
                    In stampa il saluto si adatta automaticamente al sesso e al numero di persone del nucleo familiare.
                  </p>
                </div>

                {/* Font selector */}
                <div className="space-y-2">
                  <Label>Font</Label>
                  <Select
                    value={greetingConfig.fontStyle}
                    onValueChange={(v) =>
                      onGreetingChange({ ...greetingConfig, fontStyle: v as FontStyle })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <span style={{ fontFamily: FONT_MAP[greetingConfig.fontStyle] }}>
                          {greetingConfig.fontStyle}
                        </span>
                      </SelectValue>
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

                {/* Font size slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Dimensione font</Label>
                    <span className="text-xs text-muted-foreground">{greetingConfig.fontSize}px</span>
                  </div>
                  <Slider
                    value={[greetingConfig.fontSize]}
                    onValueChange={([v]) => onGreetingChange({ ...greetingConfig, fontSize: v })}
                    min={8}
                    max={72}
                    step={1}
                  />
                </div>

                {/* Color picker */}
                <div className="space-y-3">
                  <Label>Colore testo</Label>
                  <div className="flex gap-2 flex-wrap">
                    {TEXT_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() =>
                          onGreetingChange({ ...greetingConfig, color: preset.value })
                        }
                        className={`w-9 h-9 rounded-lg border-2 transition-all ${
                          greetingConfig.color === preset.value
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border"
                        }`}
                        style={{ backgroundColor: preset.value }}
                        title={preset.label}
                      />
                    ))}
                    <Input
                      type="color"
                      value={isGreetingCustomColor ? greetingConfig.color : "#000000"}
                      onChange={(e) =>
                        onGreetingChange({ ...greetingConfig, color: e.target.value })
                      }
                      className="w-9 h-9 p-0.5 cursor-pointer rounded-lg"
                      title="Colore personalizzato"
                    />
                  </div>
                </div>

                {/* Stress test */}
                <div className="space-y-2">
                  <Label>Simula anteprima</Label>
                  <div className="flex gap-1.5">
                    {Object.entries(STRESS_MOCKS).map(([key, mock]) => (
                      <Button
                        key={key}
                        variant={stressMode === key ? "default" : "outline"}
                        size="sm"
                        className="flex-1 gap-1 text-xs"
                        onClick={() => setStressMode(key)}
                      >
                        {mock.icon} {mock.label}
                      </Button>
                    ))}
                  </div>
                  {greetingPreviewText && (
                    <p
                      className="text-center py-1.5 px-2 rounded bg-muted/50 text-sm break-words"
                      style={{
                        fontFamily: FONT_MAP[greetingConfig.fontStyle],
                        color: greetingConfig.color,
                      }}
                    >
                      {greetingPreviewText}
                    </p>
                  )}
                </div>

                {/* Reset / Remove */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onGreetingChange(DEFAULT_GREETING_CONFIG)}
                  >
                    Ripristina
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onGreetingChange(null)}
                  >
                    Rimuovi
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
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

          {/* QR Overlay */}
          <div
            className={`absolute cursor-grab active:cursor-grabbing ${
              activeObject === "qr" ? "z-20" : "z-10"
            }`}
            style={{
              left: `${qrConfig.x}%`,
              top: `${qrConfig.y}%`,
              width: `${qrConfig.width}%`,
              aspectRatio: "1 / 1",
              touchAction: "none",
            }}
            onPointerDown={handlePointerDown("qr")}
            onClick={() => setActiveObject("qr")}
          >
            <div
              className="w-full h-full flex items-center justify-center rounded-sm"
              style={{
                backgroundColor: qrConfig.quietZone ? "#ffffff" : "transparent",
                padding: qrConfig.quietZone ? "8%" : "0",
                border:
                  activeObject === "qr"
                    ? "2px dashed hsl(var(--primary))"
                    : "1px dashed hsl(var(--muted-foreground) / 0.4)",
              }}
            >
              <QRCodeSVG
                value="https://example.com/rsvp/preview"
                size={200}
                fgColor={qrConfig.color}
                bgColor="transparent"
                level="M"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            {activeObject === "qr" && (
              <div
                className="absolute -right-1.5 -bottom-1.5 w-4 h-4 bg-primary rounded-full cursor-se-resize border-2 border-background shadow-sm"
                onPointerDown={handleResizeDown("qr")}
              />
            )}
          </div>

          {/* Greeting Overlay */}
          {greetingConfig && (
            <div
              className={`absolute cursor-grab active:cursor-grabbing ${
                activeObject === "greeting" ? "z-20" : "z-10"
              }`}
              style={{
                left: `${greetingConfig.x}%`,
                top: `${greetingConfig.y}%`,
                width: `${greetingConfig.width}%`,
                touchAction: "none",
              }}
              onPointerDown={handlePointerDown("greeting")}
              onClick={() => setActiveObject("greeting")}
            >
              <div
                className="w-full px-2 py-1.5 rounded-sm text-center break-words"
                style={{
                  fontFamily: FONT_MAP[greetingConfig.fontStyle],
                  fontSize: `${greetingConfig.fontSize * 0.4}px`, // scale down for preview
                  color: greetingConfig.color,
                  lineHeight: 1.3,
                  border:
                    activeObject === "greeting"
                      ? "2px dashed hsl(var(--primary))"
                      : "1px dashed hsl(var(--muted-foreground) / 0.4)",
                  minHeight: "1.5em",
                }}
              >
                {greetingPreviewText || (
                  <span className="text-muted-foreground text-xs italic">Saluto</span>
                )}
              </div>
              {activeObject === "greeting" && (
                <div
                  className="absolute -right-1.5 -bottom-1.5 w-4 h-4 bg-primary rounded-full cursor-se-resize border-2 border-background shadow-sm"
                  onPointerDown={handleResizeDown("greeting")}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverlayCanvasEditor;
