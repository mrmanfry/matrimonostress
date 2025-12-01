import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string;
  fileName: string;
}

export function DocumentViewerDialog({
  open,
  onOpenChange,
  filePath,
  fileName,
}: DocumentViewerDialogProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const isPDF = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension || '');

  useEffect(() => {
    if (open) {
      loadFile();
    }
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [open, filePath]);

  const loadFile = async () => {
    setLoading(true);
    try {
      // Download file as blob for all types
      // This avoids ERR_BLOCKED_BY_CLIENT from ad blockers/browser extensions
      const { data, error } = await supabase.storage
        .from("vendor-contracts")
        .download(filePath);

      if (error) throw error;

      // Create blob URL with correct MIME type for PDF viewing
      const mimeType = isPDF ? 'application/pdf' : data.type;
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setFileUrl(url);
    } catch (error) {
      console.error("Error loading file:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare il documento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!fileUrl) return;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenInNewTab = () => {
    if (!fileUrl) return;
    window.open(fileUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{fileName}</DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                disabled={!fileUrl}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Apri in nuova tab
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!fileUrl}
              >
                <Download className="h-4 w-4 mr-2" />
                Scarica
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-muted">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Caricamento...</div>
            </div>
          ) : fileUrl ? (
            <>
              {isPDF && (
                <iframe
                  src={`${fileUrl}#toolbar=1`}
                  className="w-full h-full"
                  title={fileName}
                />
              )}
              {isImage && (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={fileUrl}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              {!isPDF && !isImage && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <p className="text-muted-foreground">
                    Anteprima non disponibile per questo tipo di file
                  </p>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Scarica per visualizzare
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-destructive">Errore nel caricamento del file</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
