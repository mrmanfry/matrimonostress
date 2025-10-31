import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Eye, Sparkles, X, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VendorDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorName: string;
  documents: Array<{ name: string; path: string }>;
  analyzedContract?: { id: string; analyzed_at: string; file_path: string };
  onViewDocument: (doc: { name: string; path: string }) => void;
  onViewAnalysis: () => void;
  onAnalyzeDocument: (doc: { name: string; path: string }) => void;
  onDeleteDocument: (path: string) => void;
}

export function VendorDocumentsDialog({
  open,
  onOpenChange,
  vendorName,
  documents,
  analyzedContract,
  onViewDocument,
  onViewAnalysis,
  onAnalyzeDocument,
  onDeleteDocument,
}: VendorDocumentsDialogProps) {
  const isPDF = (fileName: string) => fileName.toLowerCase().endsWith('.pdf');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Documenti - {vendorName}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessun documento caricato</p>
                <p className="text-sm mt-2">
                  Carica documenti dal pannello di modifica del fornitore
                </p>
              </div>
            ) : (
              documents.map((doc) => {
                const isAnalyzed = analyzedContract?.file_path === doc.path;
                const canAnalyze = isPDF(doc.name);

                return (
                  <div
                    key={doc.path}
                    className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{doc.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {isAnalyzed && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Analizzato
                              </Badge>
                            )}
                            {canAnalyze && !isAnalyzed && (
                              <Badge variant="outline" className="text-xs">
                                PDF
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteDocument(doc.path)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDocument(doc)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizza
                      </Button>

                      {isAnalyzed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onViewAnalysis}
                          className="flex-1"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Analisi AI
                        </Button>
                      ) : canAnalyze ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAnalyzeDocument(doc)}
                          className="flex-1"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Analizza
                        </Button>
                      ) : (
                        <div className="flex-1" />
                      )}
                    </div>

                    {isAnalyzed && analyzedContract && (
                      <div className="text-xs text-muted-foreground border-t pt-2">
                        Analizzato il {new Date(analyzedContract.analyzed_at).toLocaleDateString('it-IT')}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
