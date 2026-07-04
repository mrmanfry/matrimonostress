import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { computeEffectiveDPI, type TableauBgFit } from "@/lib/tableauGeneratorEngine";

const PRESETS = [
  { key: "auto", label: "Usa proporzioni dell'immagine (consigliato)", w: 0, h: 0 },
  { key: "70x100", label: "70×100 cm — Verticale", w: 70, h: 100 },
  { key: "100x70", label: "100×70 cm — Orizzontale", w: 100, h: 70 },
  { key: "50x70", label: "50×70 cm — Verticale", w: 50, h: 70 },
  { key: "a1", label: "A1 (59.4×84.1 cm)", w: 59.4, h: 84.1 },
  { key: "custom", label: "Personalizzato", w: 0, h: 0 },
] as const;

interface CreatedPayload {
  background_path: string;
  width_cm: number;
  height_cm: number;
  orientation: string;
  bgFit: TableauBgFit;
  bgBandsColor: string;
}

interface Props {
  open: boolean;
  weddingId: string;
  onCreated: (payload: CreatedPayload) => Promise<void>;
  onOpenChange: (o: boolean) => void;
}

export function TableauSetupWizard({ open, weddingId, onCreated, onOpenChange }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [imgPx, setImgPx] = useState<{ w: number; h: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [preset, setPreset] = useState<string>("auto");
  const [customW, setCustomW] = useState<number>(70);
  const [customH, setCustomH] = useState<number>(100);
  const [bgFit, setBgFit] = useState<TableauBgFit>("contain");
  const [bandsColor, setBandsColor] = useState<string>("#ffffff");

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setFile(null);
      setUploadedPath(null);
      setImgPx(null);
      setPreviewUrl(null);
      setPreset("auto");
    }
  }, [open]);

  const readImageDims = (f: File) =>
    new Promise<{ w: number; h: number }>((resolve, reject) => {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        resolve({ w: img.naturalWidth, h: img.naturalHeight });
        setPreviewUrl(url);
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleUpload = async () => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "File troppo grande", description: "Massimo 15MB.", variant: "destructive" });
      return;
    }
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast({ title: "Formato non supportato", description: "Usa PNG o JPG.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const dims = await readImageDims(file);
      setImgPx(dims);
      // Upload raw bytes — no re-encode.
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `${weddingId}/bg-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("tableau-backgrounds").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      setUploadedPath(path);
      setStep(2);
    } catch (e: any) {
      toast({ title: "Errore upload", description: e?.message ?? "Riprova", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const chosen = useMemo(() => {
    if (preset === "auto" && imgPx) {
      // Derive cm from image ratio; anchor the long side to 70cm by default.
      const ratio = imgPx.w / imgPx.h;
      if (ratio >= 1) {
        return { w: 100, h: +(100 / ratio).toFixed(1) };
      }
      return { w: +(70).toFixed(1), h: +(70 / ratio).toFixed(1) };
    }
    if (preset === "custom") return { w: customW, h: customH };
    const p = PRESETS.find((x) => x.key === preset);
    return p ? { w: p.w, h: p.h } : { w: 0, h: 0 };
  }, [preset, customW, customH, imgPx]);

  const imgRatio = imgPx ? imgPx.w / imgPx.h : null;
  const chosenRatio = chosen.w && chosen.h ? chosen.w / chosen.h : null;
  const ratioMismatch = imgRatio && chosenRatio ? Math.abs(imgRatio - chosenRatio) > 0.02 : false;
  const dpi = imgPx && chosen.w ? computeEffectiveDPI(imgPx.w, chosen.w) : 0;
  const lowDPI = dpi > 0 && dpi < 150;

  const handleConfirm = async () => {
    if (!uploadedPath) return;
    if (!chosen.w || !chosen.h || chosen.w < 10 || chosen.h < 10) {
      toast({ title: "Dimensioni non valide", description: "Minimo 10 cm per lato.", variant: "destructive" });
      return;
    }
    await onCreated({
      background_path: uploadedPath,
      width_cm: chosen.w,
      height_cm: chosen.h,
      orientation: chosen.w > chosen.h ? "landscape" : "portrait",
      bgFit,
      bgBandsColor: bandsColor,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Genera il tuo Tableau de Mariage</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Carica lo sfondo grafico (es. esportato da Canva) su cui sovrapporremo i tavoli."
              : "Scegli il formato di stampa. L'immagine non verrà mai stirata."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <Input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="text-sm mt-2 text-muted-foreground">
                  {file.name} — {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              PNG o JPG, max 15 MB. Il file viene salvato senza compressione aggiuntiva
              per preservare la qualità originale.
            </p>
            <div className="flex justify-end">
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Carica e continua"}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {imgPx && (
              <p className="text-xs text-muted-foreground">
                Immagine originale: {imgPx.w}×{imgPx.h} px (proporzioni {(imgPx.w / imgPx.h).toFixed(3)})
              </p>
            )}

            <RadioGroup value={preset} onValueChange={setPreset} className="space-y-2">
              {PRESETS.map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <RadioGroupItem value={p.key} id={p.key} />
                  <Label htmlFor={p.key} className="cursor-pointer">{p.label}</Label>
                </div>
              ))}
            </RadioGroup>

            {preset === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Larghezza (cm)</Label>
                  <Input type="number" min={10} value={customW} onChange={(e) => setCustomW(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Altezza (cm)</Label>
                  <Input type="number" min={10} value={customH} onChange={(e) => setCustomH(Number(e.target.value))} />
                </div>
              </div>
            )}

            {chosen.w > 0 && (
              <div className="text-sm bg-muted/40 rounded p-2">
                Formato scelto: <strong>{chosen.w}×{chosen.h} cm</strong>
                {dpi > 0 && (
                  <span className={lowDPI ? "text-amber-700 font-medium ml-2" : "text-muted-foreground ml-2"}>
                    · ~{dpi} DPI
                  </span>
                )}
              </div>
            )}

            {ratioMismatch && previewUrl && (
              <div className="space-y-2 border rounded p-3 bg-amber-50/50">
                <div className="flex items-start gap-2 text-sm text-amber-900">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Le proporzioni scelte non coincidono con quelle dell'immagine.
                    Scegli come adattarla — non verrà mai stirata.
                  </span>
                </div>
                <RadioGroup value={bgFit} onValueChange={(v) => setBgFit(v as TableauBgFit)} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="contain" id="fit-contain" />
                    <Label htmlFor="fit-contain" className="cursor-pointer text-sm">Adatta (bordi visibili)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="cover" id="fit-cover" />
                    <Label htmlFor="fit-cover" className="cursor-pointer text-sm">Riempi (ritaglia)</Label>
                  </div>
                </RadioGroup>
                {bgFit === "contain" && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Colore bordi</Label>
                    <input
                      type="color"
                      value={bandsColor}
                      onChange={(e) => setBandsColor(e.target.value)}
                      className="h-7 w-10 rounded border cursor-pointer"
                    />
                  </div>
                )}
                <div
                  className="rounded overflow-hidden border mx-auto"
                  style={{
                    width: 220,
                    aspectRatio: `${chosen.w} / ${chosen.h}`,
                    backgroundColor: bgFit === "contain" ? bandsColor : "transparent",
                  }}
                >
                  <img
                    src={previewUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: bgFit, display: "block" }}
                  />
                </div>
              </div>
            )}

            {lowDPI && (
              <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2 text-amber-900 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  L'immagine è a bassa risoluzione per questo formato di stampa: ~{dpi} DPI.
                  Consigliato ≥ 150, ideale 300. Esporta da Canva a risoluzione maggiore o riduci il formato.
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Indietro</Button>
              <Button onClick={handleConfirm}>Apri lo Studio</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
