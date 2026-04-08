import { AlertTriangle, ArrowRight, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { validateBookletCompleteness, type MassBookletContent } from "@/lib/massBookletSchema";
import { pdf } from "@react-pdf/renderer";
import BookletPdfDocument from "./pdf/BookletPdfDocument";
import { generateBookletDocx } from "@/lib/bookletDocxExport";

interface Props {
  content: MassBookletContent;
  onGoToStep: (step: number) => void;
  partner1: string;
  partner2: string;
}

export default function BookletStepPreview({ content, onGoToStep, partner1, partner2 }: Props) {
  const [accepted, setAccepted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const validation = validateBookletCompleteness(content);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleGeneratePreview = async () => {
    setGenerating(true);
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const doc = <BookletPdfDocument content={content} partner1={partner1} partner2={partner2} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (e) {
      console.error("PDF generation error:", e);
      toast.error("Impossibile generare l'anteprima PDF. Riprova tra poco.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const doc = <BookletPdfDocument content={content} partner1={partner1} partner2={partner2} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Libretto_Messa_${partner1}_${partner2}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF download error:", e);
      toast.error("Impossibile scaricare il PDF. Riprova tra poco.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadDocx = async () => {
    setGeneratingDocx(true);
    try {
      const blob = await generateBookletDocx(content, partner1, partner2);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Libretto_Messa_${partner1}_${partner2}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("File Word scaricato! Puoi modificarlo liberamente.");
    } catch (e) {
      console.error("DOCX generation error:", e);
      toast.error("Impossibile generare il file Word. Riprova tra poco.");
    } finally {
      setGeneratingDocx(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold mb-1">Anteprima & Export</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Controlla che tutte le informazioni siano complete prima di generare il PDF.
        </p>
      </div>

      {/* Validation */}
      {!validation.isComplete && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Campi obbligatori mancanti
          </div>
          {validation.missing.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onGoToStep(m.step)}
              className="flex items-center gap-2 text-sm text-destructive hover:underline"
            >
              <ArrowRight className="w-3 h-3" />
              <span>Step {m.step}: {m.label}</span>
            </button>
          ))}
        </div>
      )}

      {validation.isComplete && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-primary font-medium">
          ✓ Tutti i campi obbligatori sono compilati. Il libretto è pronto per la generazione.
        </div>
      )}

      {/* PDF Preview */}
      {validation.isComplete && !previewUrl && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleGeneratePreview} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {generating ? "Generazione..." : "Mostra anteprima PDF"}
          </Button>
        </div>
      )}

      {previewUrl && (
        <div className="border rounded-xl overflow-hidden" style={{ height: 600 }}>
          <iframe src={previewUrl} width="100%" height="100%" title="Anteprima libretto" />
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="disclaimer"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="disclaimer" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
            Ho riletto attentamente i testi, controllato i nomi e mi impegno a stampare una <strong>copia di prova</strong> prima
            di procedere con la stampa definitiva.
          </Label>
        </div>
      </div>

      {/* Download buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          disabled={!validation.isComplete || !accepted || generating}
          className="flex-1 gap-2"
          size="lg"
          onClick={handleDownload}
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generazione PDF...</>
          ) : (
            <><Download className="w-4 h-4" /> Scarica PDF</>
          )}
        </Button>

        <Button
          variant="outline"
          disabled={!validation.isComplete || !accepted || generatingDocx}
          className="flex-1 gap-2"
          size="lg"
          onClick={handleDownloadDocx}
        >
          {generatingDocx ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generazione Word...</>
          ) : (
            <><FileText className="w-4 h-4" /> Scarica Word (.docx)</>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Il file Word è completamente modificabile in Microsoft Word o Google Docs.
      </p>
    </div>
  );
}
