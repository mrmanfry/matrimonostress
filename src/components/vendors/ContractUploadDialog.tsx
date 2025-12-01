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
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Save record to database (without AI analysis)
      const { error: dbError } = await supabase
        .from("vendor_contracts")
        .insert({
          vendor_id: vendorId,
          wedding_id: weddingId,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          ai_analysis: null,
          analyzed_at: null,
        });

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "Documento caricato",
        description: "Il file è stato caricato con successo",
      });

      onOpenChange(false);
      
      // Trigger refresh (pass empty analysis to signal completion)
      onAnalysisComplete({}, {
        fileName: file.name,
        filePath: fileName,
        fileType: file.type,
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante il caricamento",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Tutti i formati supportati (max 20MB)
            </p>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento in corso...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};