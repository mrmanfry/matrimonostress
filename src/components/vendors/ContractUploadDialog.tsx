import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ContractInstallmentsReviewDialog,
  type ExtractedInstallment,
} from "./ContractInstallmentsReviewDialog";

interface ContractUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  weddingId: string;
  weddingDate?: string;
  totalContract?: number;
  onAnalysisComplete: (analysis: any, fileInfo: any) => void;
}

export const ContractUploadDialog = ({
  open,
  onOpenChange,
  vendorId,
  weddingId,
  weddingDate,
  onAnalysisComplete,
}: ContractUploadDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [installments, setInstallments] = useState<ExtractedInstallment[]>([]);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: "Il file deve essere inferiore a 20MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const storagePath = `${weddingId}/${vendorId}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("vendor-contracts")
        .upload(storagePath, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      toast({
        title: "Documento caricato",
        description: "Avvio l'analisi AI per estrarre le rate…",
      });

      setUploading(false);
      setAnalyzing(true);

      // Trigger AI analysis
      const { data, error: analyzeError } = await supabase.functions.invoke(
        "analyze-contract",
        { body: { fileUrl: storagePath } },
      );

      setAnalyzing(false);

      if (analyzeError) {
        console.error("[ContractUpload] analyze error:", analyzeError);
        toast({
          title: "Analisi AI non riuscita",
          description: "Il file è stato salvato ma non è stato possibile estrarre le rate automaticamente.",
          variant: "destructive",
        });
        onOpenChange(false);
        onAnalysisComplete({}, {});
        return;
      }

      const extracted: ExtractedInstallment[] = data?.analysis?.extracted_installments || [];

      if (extracted.length === 0) {
        toast({
          title: "Nessuna rata trovata",
          description: "L'AI non ha individuato rate strutturate. Puoi aggiungerle manualmente dal piano di pagamento.",
        });
        onOpenChange(false);
        onAnalysisComplete({}, {});
        return;
      }

      setInstallments(extracted);
      setReviewOpen(true);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante il caricamento",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <>
      <Dialog open={open && !reviewOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Carica Contratto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contract-file">Seleziona File</Label>
              <Input
                id="contract-file"
                type="file"
                onChange={handleFileUpload}
                disabled={uploading || analyzing}
              />
              <p className="text-sm text-muted-foreground">
                L'AI analizzerà il contratto e proporrà automaticamente le rate da pagare. Max 20MB.
              </p>
            </div>

            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento in corso…
              </div>
            )}
            {analyzing && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI sta analizzando il contratto e estraendo le rate…
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ContractInstallmentsReviewDialog
        open={reviewOpen}
        onOpenChange={(o) => {
          setReviewOpen(o);
          if (!o) {
            onOpenChange(false);
            onAnalysisComplete({}, {});
          }
        }}
        installments={installments}
        vendorId={vendorId}
        weddingId={weddingId}
        weddingDate={weddingDate}
        onSaved={() => {
          setReviewOpen(false);
          onOpenChange(false);
          onAnalysisComplete({}, {});
        }}
      />
    </>
  );
};
