import { AlertTriangle, ArrowRight, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, lazy, Suspense } from "react";
import { validateBookletCompleteness, type MassBookletContent } from "@/lib/massBookletSchema";
import { BlobProvider, PDFViewer } from "@react-pdf/renderer";

const BookletPdfDocument = lazy(() => import("./pdf/BookletPdfDocument"));

interface Props {
  content: MassBookletContent;
  onGoToStep: (step: number) => void;
  partner1: string;
  partner2: string;
}

export default function BookletStepPreview({ content, onGoToStep, partner1, partner2 }: Props) {
  const [accepted, setAccepted] = useState(false);
  const validation = validateBookletCompleteness(content);

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
      {validation.isComplete && !showPreview && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowPreview(true)} className="gap-2">
            <FileText className="w-4 h-4" />
            Mostra anteprima PDF
          </Button>
        </div>
      )}

      {validation.isComplete && showPreview && (
        <div className="border rounded-xl overflow-hidden" style={{ height: 600 }}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Generazione anteprima...</span>
            </div>
          }>
            <PDFViewer width="100%" height="100%" showToolbar={false}>
              <BookletPdfDocument content={content} partner1={partner1} partner2={partner2} />
            </PDFViewer>
          </Suspense>
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

      {/* Download button */}
      {validation.isComplete && (
        <Suspense fallback={null}>
          <BlobProvider document={
            <BookletPdfDocument content={content} partner1={partner1} partner2={partner2} />
          }>
            {({ blob, loading, error }) => (
              <Button
                disabled={!accepted || loading || !!error}
                className="w-full gap-2"
                size="lg"
                onClick={() => {
                  if (!blob) return;
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Libretto_Messa_${partner1}_${partner2}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generazione PDF...</>
                ) : (
                  <><Download className="w-4 h-4" /> Scarica PDF</>
                )}
              </Button>
            )}
          </BlobProvider>
        </Suspense>
      )}

      {!validation.isComplete && (
        <Button disabled className="w-full gap-2" size="lg">
          <FileText className="w-4 h-4" />
          Completa i campi obbligatori per generare il PDF
        </Button>
      )}
    </div>
  );
}
