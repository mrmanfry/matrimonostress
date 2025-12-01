import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Eye, Trash2, Sparkles, Calendar } from "lucide-react";
import { toast } from "sonner";
import { ContractUploadDialog } from "../ContractUploadDialog";
import ContractViewDialog from "../ContractViewDialog";
import { ContractReviewDialog } from "../ContractReviewDialog";
import { DocumentViewerDialog } from "../DocumentViewerDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface VendorDocumentsWidgetProps {
  vendorId: string;
  vendorName: string;
}

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  analyzed_at: string | null;
  ai_analysis: any;
}

interface ContractAnalysis {
  full_text: string[];
  sections: any[];
}

export function VendorDocumentsWidget({ vendorId, vendorName }: VendorDocumentsWidgetProps) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewDocument, setViewDocument] = useState<Document | null>(null);
  const [reviewDocument, setReviewDocument] = useState<Document | null>(null);
  const [deleteDocument, setDeleteDocument] = useState<Document | null>(null);
  const [viewContractVendor, setViewContractVendor] = useState<any>(null);

  // Fetch wedding data for dialogs
  const { data: wedding } = useQuery({
    queryKey: ["wedding-for-vendor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("weddings")
        .select("id, wedding_date")
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["vendor-documents", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_contracts")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Document[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (document: Document) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("vendor-contracts")
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("vendor_contracts")
        .delete()
        .eq("id", document.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-documents", vendorId] });
      toast.success("Documento eliminato");
      setDeleteDocument(null);
    },
    onError: (error) => {
      toast.error("Errore nell'eliminazione: " + error.message);
    },
  });

  const isPDF = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.pdf');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Caricamento documenti...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Documenti e Contratti
          </CardTitle>
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Carica Documento
          </Button>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nessun documento caricato</p>
              <Button onClick={() => setUploadOpen(true)} variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Carica il primo documento
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 border rounded-lg bg-card hover:border-indigo-200 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.file_name}</p>
                      <div className="flex gap-2 mt-2">
                        {isPDF(doc.file_name) && (
                          <Badge variant="secondary" className="text-xs">PDF</Badge>
                        )}
                        {doc.analyzed_at && (
                          <Badge variant="default" className="text-xs bg-indigo-100 text-indigo-700">
                            Analizzato
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {doc.analyzed_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(doc.analyzed_at).toLocaleDateString()}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewDocument(doc)}
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Visualizza
                    </Button>

                    {doc.analyzed_at && doc.ai_analysis ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setViewContractVendor({
                            id: vendorId,
                            name: vendorName,
                            vendor_contracts: [{
                              id: doc.id,
                              analyzed_at: doc.analyzed_at,
                              ai_analysis: doc.ai_analysis,
                              file_path: doc.file_path
                            }]
                          });
                        }}
                        className="flex-1"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Analisi AI
                      </Button>
                    ) : isPDF(doc.file_name) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewDocument(doc)}
                        className="flex-1"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Analizza
                      </Button>
                    ) : null}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteDocument(doc)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {wedding && (
        <ContractUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          vendorId={vendorId}
          weddingId={wedding.id}
          weddingDate={wedding.wedding_date}
          onAnalysisComplete={(analysis, fileInfo) => {
            queryClient.invalidateQueries({ queryKey: ["vendor-documents", vendorId] });
            setUploadOpen(false);
          }}
        />
      )}

      {viewDocument && (
        <DocumentViewerDialog
          open={!!viewDocument}
          onOpenChange={(open) => !open && setViewDocument(null)}
          filePath={viewDocument.file_path}
          fileName={viewDocument.file_name}
        />
      )}

      {viewContractVendor && (
        <ContractViewDialog
          open={!!viewContractVendor}
          onOpenChange={(open) => !open && setViewContractVendor(null)}
          vendor={viewContractVendor}
        />
      )}

      {reviewDocument && wedding && reviewDocument.ai_analysis && (
        <ContractReviewDialog
          open={!!reviewDocument}
          onOpenChange={(open) => !open && setReviewDocument(null)}
          analysis={reviewDocument.ai_analysis as ContractAnalysis}
          fileInfo={{
            fileName: reviewDocument.file_name,
            filePath: reviewDocument.file_path,
            fileType: reviewDocument.file_type
          }}
          vendorId={vendorId}
          weddingId={wedding.id}
          onSaveComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["vendor-documents", vendorId] });
            setReviewDocument(null);
          }}
        />
      )}

      <AlertDialog open={!!deleteDocument} onOpenChange={(open) => !open && setDeleteDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare "{deleteDocument?.file_name}"? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDocument && deleteMutation.mutate(deleteDocument)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
