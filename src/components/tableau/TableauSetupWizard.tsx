import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRESETS = [
  { key: "70x100", label: "70×100 cm — Verticale", w: 70, h: 100, orient: "portrait" },
  { key: "100x70", label: "100×70 cm — Orizzontale", w: 100, h: 70, orient: "landscape" },
  { key: "50x70", label: "50×70 cm — Verticale", w: 50, h: 70, orient: "portrait" },
  { key: "a1", label: "A1 (59.4×84.1 cm)", w: 59.4, h: 84.1, orient: "portrait" },
  { key: "custom", label: "Personalizzato", w: 0, h: 0, orient: "portrait" },
] as const;

interface Props {
  open: boolean;
  weddingId: string;
  onCreated: (payload: { background_path: string; width_cm: number; height_cm: number; orientation: string }) => Promise<void>;
  onOpenChange: (o: boolean) => void;
}

export function TableauSetupWizard({ open, weddingId, onCreated, onOpenChange }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [preset, setPreset] = useState<string>("70x100");
  const [customW, setCustomW] = useState<number>(70);
  const [customH, setCustomH] = useState<number>(100);

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
    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `${weddingId}/bg-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tableau-backgrounds").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    setUploading(false);
    if (error) {
      toast({ title: "Errore upload", description: error.message, variant: "destructive" });
      return;
    }
    setUploadedPath(path);
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!uploadedPath) return;
    const p = PRESETS.find((x) => x.key === preset)!;
    const w = preset === "custom" ? customW : p.w;
    const h = preset === "custom" ? customH : p.h;
    if (!w || !h || w < 10 || h < 10) {
      toast({ title: "Dimensioni non valide", description: "Minimo 10 cm per lato.", variant: "destructive" });
      return;
    }
    await onCreated({
      background_path: uploadedPath,
      width_cm: w,
      height_cm: h,
      orientation: w > h ? "landscape" : "portrait",
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
              : "Scegli il formato di stampa. Le proporzioni verranno rispettate esattamente."}
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
              Formati: PNG o JPG. Massimo 15 MB. Consigliato: immagine ad alta risoluzione con proporzioni
              coerenti col formato di stampa.
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
