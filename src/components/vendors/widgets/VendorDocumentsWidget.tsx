import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Upload, Eye, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ContractUploadDialog } from "../ContractUploadDialog";
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
}

export function VendorDocumentsWidget({ vendorId, vendorName }: VendorDocumentsWidgetProps) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewDocument, setViewDocument] = useState<Document | null>(null);
  const [deleteDocument, setDeleteDocument] = useState<Document | null>(null);
  const [renamingDoc, setRenamingDoc] = useState<Document | null>(null);
  const [newFileName, setNewFileName] = useState("");

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

  // Fetch documents from Storage
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["vendor-documents", vendorId],
    queryFn: async () => {
      // First get the wedding_id for this vendor
      const { data: vendorData, error: vendorError } = await supabase
        .from("vendors")
        .select("wedding_id")
        .eq("id", vendorId)
        .single();

      if (vendorError) throw vendorError;
      if (!vendorData) throw new Error("Vendor not found");

      // List files from Storage bucket
      const storagePath = `${vendorData.wedding_id}/${vendorId}`;
      const { data: files, error: storageError } = await supabase.storage
        .from("vendor-contracts")
        .list(storagePath);

      if (storageError) throw storageError;

      // Transform storage files to Document format
      return (files || []).map(file => ({
        id: file.id,
        file_name: file.name,
        file_path: `${storagePath}/${file.name}`,
        file_type: file.metadata?.mimetype || 'application/octet-stream',
      })) as Document[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (document: Document) => {
      // Delete from storage only
      const { error: storageError } = await supabase.storage
        .from("vendor-contracts")
        .remove([document.file_path]);

      if (storageError) throw storageError;
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

  // Rename mutation (download → upload with new name → delete old)
  const renameMutation = useMutation({
    mutationFn: async ({ filePath, newName }: { filePath: string; newName: string }) => {
      // 1. Download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("vendor-contracts")
        .download(filePath);

      if (downloadError) throw downloadError;
      if (!fileData) throw new Error("File not found");

      // 2. Upload with new name (keeping same path structure)
      const pathParts = filePath.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');

      const { error: uploadError } = await supabase.storage
        .from("vendor-contracts")
        .upload(newPath, fileData, {
          contentType: fileData.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 3. Delete old file
      const { error: deleteError } = await supabase.storage
        .from("vendor-contracts")
        .remove([filePath]);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-documents", vendorId] });
      toast.success("Documento rinominato");
      setRenamingDoc(null);
      setNewFileName("");
    },
    onError: (error) => {
      toast.error("Errore nella rinomina: " + error.message);
    },
  });

  const isPDF = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.pdf');
  };

  const handleRenameClick = (doc: Document) => {
    setRenamingDoc(doc);
    setNewFileName(doc.file_name);
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
                      </div>
                    </div>
                  </div>

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

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRenameClick(doc)}
                      className="flex-1"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Rinomina
                    </Button>

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

      {/* Upload Dialog */}
      {wedding && (
        <ContractUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          vendorId={vendorId}
          weddingId={wedding.id}
          weddingDate={wedding.wedding_date}
          onAnalysisComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["vendor-documents", vendorId] });
            setUploadOpen(false);
          }}
        />
      )}

      {/* View Document Dialog */}
      {viewDocument && (
        <DocumentViewerDialog
          open={!!viewDocument}
          onOpenChange={(open) => !open && setViewDocument(null)}
          filePath={viewDocument.file_path}
          fileName={viewDocument.file_name}
        />
      )}

      {/* Rename Dialog */}
      <Dialog open={!!renamingDoc} onOpenChange={(open) => !open && setRenamingDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rinomina Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Nuovo nome file"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingDoc(null)}>
              Annulla
            </Button>
            <Button
              onClick={() => renamingDoc && renameMutation.mutate({ filePath: renamingDoc.file_path, newName: newFileName })}
              disabled={!newFileName.trim() || renameMutation.isPending}
            >
              {renameMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
