import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  totalContract,
  onAnalysisComplete,
}: ContractUploadDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "image/png",
      "image/jpeg",
      "image/heic",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato non supportato",
        description: "Carica un file PDF, DOCX o immagine (PNG, JPG, HEIC)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 20MB)
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
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${weddingId}/${vendorId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("vendor-contracts")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      setUploading(false);
      setAnalyzing(true);

      toast({
        title: "File caricato",
        description: "Analisi AI del contratto in corso... 🤖 (Potrebbe richiedere fino a 60 secondi)",
      });

      // Call edge function to analyze contract
      const { data, error } = await supabase.functions.invoke("analyze-contract", {
        body: {
          fileUrl: fileName,
          totalContract,
          weddingDate,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.analysis) {
        throw new Error("Analisi fallita");
      }

      toast({
        title: "Analisi completata",
        description: "Rivedi i dati estratti prima di salvarli",
      });

      onAnalysisComplete(data.analysis, {
        fileName: file.name,
        filePath: fileName,
        fileType: file.type,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error uploading/analyzing contract:", error);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Carica Contratto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contract-file">Seleziona File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="contract-file"
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.heic"
                onChange={handleFileUpload}
                disabled={uploading || analyzing}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Formati supportati: PDF, DOCX, PNG, JPG, HEIC (max 20MB)
            </p>
          </div>

          {(uploading || analyzing) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {uploading && "Caricamento in corso..."}
              {analyzing && "Analisi AI in corso... Potrebbe richiedere fino a 60 secondi"}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};