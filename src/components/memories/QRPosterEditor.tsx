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
  const posterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved design
  useEffect(() => {
    if (!open || !cameraId) return;
    supabase
      .from("disposable_cameras" as any)
      .select("poster_design")
      .eq("id", cameraId)
      .maybeSingle()
      .then(({ data }) => {
        if ((data as any)?.poster_design) {
          setDesign({ ...DEFAULT_DESIGN, ...(data as any).poster_design });
        }
      });
  }, [open, cameraId]);

  const updateDesign = (partial: Partial<PosterDesign>) => {
    setDesign((prev) => ({ ...prev, ...partial }));
  };

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

  const fontFamily = FONT_MAP[design.font];

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
              <div className="relative z-10 flex flex-col items-center justify-between h-full py-10 px-6 text-center">
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

                {/* Center — QR */}
                <div className="bg-white p-4 rounded-lg shadow-lg">
                  <QRCode value={cameraUrl} size={120} level="M" />
                </div>

                {/* Bottom — instruction */}
                <div>
                  <p className="text-[10px]" style={{ color: design.accentColor }}>
                    {design.instruction}
                  </p>
                </div>
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
