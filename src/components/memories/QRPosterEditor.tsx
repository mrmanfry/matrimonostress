import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Upload, Download, X, ArrowLeft } from "lucide-react";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";

const GOLD = "#C9A96E";

type FontChoice = "garamond" | "cormorant" | "playfair" | "lora" | "montserrat" | "dancing";

const FONT_MAP: Record<FontChoice, string> = {
  garamond: "'EB Garamond', serif",
  cormorant: "'Cormorant Garamond', serif",
  playfair: "'Playfair Display', serif",
  lora: "'Lora', serif",
  montserrat: "'Montserrat', sans-serif",
  dancing: "'Dancing Script', cursive",
};

interface PosterDesign {
  title: string;
  subtitle: string;
  instruction: string;
  font: FontChoice;
  bgColor: string;
  textColor: string;
  accentColor: string;
  backgroundImageUrl: string | null;
  qrSize: number;      // QR code size in px (within preview scale)
  qrX: number;         // QR X position (% from left, 0-100)
  qrY: number;         // QR Y position (% from top, 0-100)
}

const DEFAULT_DESIGN: PosterDesign = {
  title: "Scatta un ricordo!",
  subtitle: "Il nostro rullino digitale",
  instruction: "Scansiona il QR code per scattare una foto 📷",
  font: "cormorant",
  bgColor: "#1A1A1A",
  textColor: "#FFFFFF",
  accentColor: GOLD,
  backgroundImageUrl: null,
  qrSize: 80,
  qrX: 50,
  qrY: 55,
};

interface QRPosterEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraUrl: string;
  cameraId: string;
  weddingNames?: string;
  weddingDate?: string;
}

export default function QRPosterEditor({
  open,
  onOpenChange,
  cameraUrl,
  cameraId,
  weddingNames,
  weddingDate,
}: QRPosterEditorProps) {
  const [design, setDesign] = useState<PosterDesign>({
    ...DEFAULT_DESIGN,
    title: weddingNames ? `${weddingNames}` : DEFAULT_DESIGN.title,
  });
  const [step, setStep] = useState<1 | 2>(1);
  const [generating, setGenerating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  // Load saved design
  useEffect(() => {
    if (!open || !cameraId) return;
    loadedRef.current = false;
    supabase
      .from("disposable_cameras" as any)
      .select("poster_design")
      .eq("id", cameraId)
      .maybeSingle()
      .then(({ data }) => {
        if ((data as any)?.poster_design) {
          const saved = (data as any).poster_design;
          setDesign((prev) => ({
            ...DEFAULT_DESIGN,
            ...saved,
            // Keep locally uploaded image if any, don't override with null from DB
            backgroundImageUrl: prev.backgroundImageUrl || saved.backgroundImageUrl || null,
            // Ensure new fields have defaults
            qrSize: saved.qrSize ?? DEFAULT_DESIGN.qrSize,
            qrX: saved.qrX ?? DEFAULT_DESIGN.qrX,
            qrY: saved.qrY ?? DEFAULT_DESIGN.qrY,
          }));
        }
        loadedRef.current = true;
      });
  }, [open, cameraId]);

  const updateDesign = (partial: Partial<PosterDesign>) => {
    setDesign((prev) => ({ ...prev, ...partial }));
  };

  // Debounced auto-save
  useEffect(() => {
    if (!loadedRef.current || !cameraId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const { backgroundImageUrl, ...saveable } = design;
      supabase
        .from("disposable_cameras" as any)
        .update({ poster_design: saveable as any })
        .eq("id", cameraId)
        .then(() => {});
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [design, cameraId]);

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateDesign({ backgroundImageUrl: url });
  };

  const saveDesign = useCallback(async () => {
    if (!cameraId) return;
    const { backgroundImageUrl, ...saveable } = design;
    await supabase
      .from("disposable_cameras" as any)
      .update({ poster_design: saveable as any })
      .eq("id", cameraId);
  }, [cameraId, design]);

  const handleExportPDF = async () => {
    if (!posterRef.current) return;
    setGenerating(true);

    try {
      await saveDesign();

      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(posterRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: design.bgColor,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      // A3: 297×420mm
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a3" });
      pdf.addImage(imgData, "JPEG", 0, 0, 297, 420);

      const link = document.createElement("a");
      link.download = "Poster_QR_Rullino.pdf";
      link.href = URL.createObjectURL(pdf.output("blob"));
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setGenerating(false);
    }
  };

  // --- Drag logic for QR code ---
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const poster = posterRef.current;
      if (!poster) return;
      setDragging(true);

      const rect = poster.getBoundingClientRect();

      const onMove = (ev: PointerEvent) => {
        const x = ((ev.clientX - rect.left) / rect.width) * 100;
        const y = ((ev.clientY - rect.top) / rect.height) * 100;
        setDesign((prev) => ({
          ...prev,
          qrX: Math.max(5, Math.min(95, x)),
          qrY: Math.max(5, Math.min(95, y)),
        }));
      };

      const onUp = () => {
        setDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    []
  );

  const fontFamily = FONT_MAP[design.font];

  // Calculate actual QR pixel size for the preview (poster preview is 297px wide)
  const qrPx = design.qrSize;
  const qrPadding = Math.round(qrPx * 0.12);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 flex flex-col gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <Button variant="ghost" size="icon" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h2 className="text-lg font-semibold text-foreground">
              {step === 1 ? "Progetta il Poster QR" : "Esporta"}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Preview */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-muted/30">
            <div
              ref={posterRef}
              className="w-[297px] shadow-2xl flex flex-col items-center justify-between overflow-hidden"
              style={{
                height: "420px",
                background: design.bgColor,
                fontFamily,
                position: "relative",
              }}
            >
              {/* Background image */}
              {design.backgroundImageUrl && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${design.backgroundImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: 0.3,
                  }}
                />
              )}

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center h-full py-10 px-6 text-center">
                {/* Top — titles */}
                <div>
                  <p
                    className="text-[8px] tracking-[0.4em] uppercase mb-3"
                    style={{ color: design.accentColor }}
                  >
                    Memories Reel
                  </p>
                  <h1
                    className="text-2xl font-bold leading-tight mb-2"
                    style={{ color: design.textColor }}
                  >
                    {design.title}
                  </h1>
                  <p className="text-xs" style={{ color: `${design.textColor}80` }}>
                    {design.subtitle}
                  </p>
                  {weddingDate && (
                    <p className="text-[9px] mt-1" style={{ color: `${design.textColor}50` }}>
                      {weddingDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Draggable QR code — absolutely positioned */}
              <div
                className="absolute z-20"
                style={{
                  left: `${design.qrX}%`,
                  top: `${design.qrY}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: dragging ? "grabbing" : "grab",
                  touchAction: "none",
                }}
                onPointerDown={handlePointerDown}
              >
                <div
                  className="bg-white rounded-lg shadow-lg"
                  style={{ padding: `${qrPadding}px` }}
                >
                  <QRCode value={cameraUrl} size={qrPx} level="M" />
                </div>
              </div>

              {/* Bottom — instruction */}
              <div className="absolute bottom-8 left-0 right-0 z-10 text-center px-6">
                <p className="text-[10px]" style={{ color: design.accentColor }}>
                  {design.instruction}
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          {step === 1 && (
            <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-border overflow-y-auto p-4 space-y-4">
              <div>
                <Label className="text-xs">Titolo</Label>
                <Input
                  value={design.title}
                  onChange={(e) => updateDesign({ title: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Sottotitolo</Label>
                <Input
                  value={design.subtitle}
                  onChange={(e) => updateDesign({ subtitle: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Istruzione</Label>
                <Input
                  value={design.instruction}
                  onChange={(e) => updateDesign({ instruction: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Font</Label>
                <Select
                  value={design.font}
                  onValueChange={(v) => updateDesign({ font: v as FontChoice })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cormorant">Cormorant Garamond</SelectItem>
                    <SelectItem value="garamond">EB Garamond</SelectItem>
                    <SelectItem value="playfair">Playfair Display</SelectItem>
                    <SelectItem value="lora">Lora</SelectItem>
                    <SelectItem value="montserrat">Montserrat</SelectItem>
                    <SelectItem value="dancing">Dancing Script</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* QR size slider */}
              <div>
                <Label className="text-xs">Dimensione QR code</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Slider
                    value={[design.qrSize]}
                    onValueChange={([v]) => updateDesign({ qrSize: v })}
                    min={40}
                    max={160}
                    step={4}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-10 text-right">{design.qrSize}px</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Trascina il QR sull'anteprima per posizionarlo
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Sfondo</Label>
                  <input
                    type="color"
                    value={design.bgColor}
                    onChange={(e) => updateDesign({ bgColor: e.target.value })}
                    className="w-full h-8 rounded cursor-pointer mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Testo</Label>
                  <input
                    type="color"
                    value={design.textColor}
                    onChange={(e) => updateDesign({ textColor: e.target.value })}
                    className="w-full h-8 rounded cursor-pointer mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Accento</Label>
                  <input
                    type="color"
                    value={design.accentColor}
                    onChange={(e) => updateDesign({ accentColor: e.target.value })}
                    className="w-full h-8 rounded cursor-pointer mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Immagine di sfondo</Label>
                <Button
                  variant="outline"
                  className="w-full mt-1 gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                  {design.backgroundImageUrl ? "Cambia foto" : "Carica foto"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBgUpload}
                />
                {design.backgroundImageUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 text-xs"
                    onClick={() => updateDesign({ backgroundImageUrl: null })}
                  >
                    Rimuovi foto
                  </Button>
                )}
              </div>

              <Button className="w-full gap-2" onClick={() => setStep(2)}>
                Anteprima & Esporta
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-border overflow-y-auto p-4 flex flex-col gap-4">
              <div className="rounded-lg p-4 border border-border space-y-2">
                <h3 className="font-semibold text-sm">Esporta PDF A3</h3>
                <p className="text-xs text-muted-foreground">
                  Il poster sarà generato in formato A3 (297×420mm) a 300 DPI, pronto per la stampa professionale.
                </p>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleExportPDF}
                disabled={generating}
              >
                <Download size={16} />
                {generating ? "Generazione..." : "Scarica PDF A3"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
