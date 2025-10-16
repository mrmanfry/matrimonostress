import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { vendorSchema, type VendorFormData } from "@/lib/validationSchemas";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Vendor {
  id?: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  category_id: string | null;
}

interface VendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
  categories: Array<{ id: string; name: string }>;
  onSave: (vendor: Partial<Vendor>) => Promise<void>;
}

const emptyVendor: VendorFormData = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  status: "evaluating",
  notes: "",
  category_id: "",
};

export function VendorDialog({
  open,
  onOpenChange,
  vendor,
  categories,
  onSave,
}: VendorDialogProps) {
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; path: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [savedVendorData, setSavedVendorData] = useState<{name: string, category_id: string | null} | null>(null);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: emptyVendor,
  });

  const categoryId = watch("category_id");
  const status = watch("status");

  useEffect(() => {
    if (vendor) {
      reset({
        name: vendor.name,
        contact_name: vendor.contact_name || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        status: vendor.status as VendorFormData["status"],
        notes: vendor.notes || "",
        category_id: vendor.category_id || "",
      });
      setPreviousStatus(vendor.status);
      if (vendor.id) {
        loadExistingFiles(vendor.id);
      }
    } else {
      reset(emptyVendor);
      setUploadedFiles([]);
      setPreviousStatus(null);
    }
  }, [vendor, open, reset]);

  const loadExistingFiles = async (vendorId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase.storage
        .from("vendor-documents")
        .list(`${user.user.id}/${vendorId}`);

      if (error) throw error;

      if (data) {
        setUploadedFiles(
          data.map((file) => ({
            name: file.name,
            path: `${user.user.id}/${vendorId}/${file.name}`,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading files:", error);
    }
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Il file "${file.name}" supera la dimensione massima di 10MB (dimensione: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Il formato del file "${file.name}" non è supportato. Formati consentiti: PDF, DOC, DOCX, JPG, PNG, WEBP`
      };
    }

    return { valid: true };
  };

  const uploadWithRetry = async (
    filePath: string,
    file: File,
    maxRetries = 3,
    retryDelay = 1000
  ): Promise<void> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setUploadProgress(0);
        
        const { error: uploadError } = await supabase.storage
          .from("vendor-documents")
          .upload(filePath, file, { 
            upsert: true,
          });

        if (uploadError) throw uploadError;

        setUploadProgress(100);
        return; // Success - exit retry loop
      } catch (error: any) {
        lastError = error;
        console.error(`Upload attempt ${attempt} failed:`, error);

        // Check if it's a network error that can be retried
        const isNetworkError = error.message?.includes('network') || 
                               error.message?.includes('fetch') ||
                               error.status === 0;

        if (attempt < maxRetries && isNetworkError) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }

        throw error; // If not retryable or max retries reached, throw
      }
    }

    throw lastError || new Error('Upload failed after retries');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !vendor?.id) return;

    const file = files[0];

    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: "File non valido",
        description: validation.error,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Utente non autenticato");

      const filePath = `${user.user.id}/${vendor.id}/${file.name}`;

      // Upload with automatic retry on network errors
      await uploadWithRetry(filePath, file);

      setUploadedFiles((prev) => [
        ...prev,
        { name: file.name, path: filePath },
      ]);

      toast({
        title: "File caricato",
        description: `${file.name} è stato caricato con successo`,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      
      const isNetworkError = error.message?.includes('network') || 
                            error.message?.includes('fetch');
      
      toast({
        title: "Errore caricamento",
        description: isNetworkError 
          ? "Errore di connessione. Controlla la rete e riprova."
          : error.message || "Si è verificato un errore durante il caricamento",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  const handleFileDelete = async (filePath: string) => {
    try {
      const { error } = await supabase.storage
        .from("vendor-documents")
        .remove([filePath]);

      if (error) throw error;

      setUploadedFiles((prev) => prev.filter((f) => f.path !== filePath));

      toast({
        title: "File eliminato",
        description: "Il file è stato rimosso con successo",
      });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Errore eliminazione",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("vendor-documents")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Errore download",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: VendorFormData) => {
    try {
      const vendorData = {
        ...data,
        id: vendor?.id,
        contact_name: data.contact_name || null,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        category_id: data.category_id || null,
      };
      
      await onSave(vendorData);
      
      // Workflow: Fornitore confermato -> suggerisci creazione spesa
      const isStatusChangedToBooked = vendor && previousStatus !== 'booked' && data.status === 'booked';
      
      if (isStatusChangedToBooked) {
        setSavedVendorData({
          name: data.name,
          category_id: data.category_id || null
        });
        setShowExpenseDialog(true);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error saving vendor:", error);
    }
  };

  const handleCreateExpense = () => {
    setShowExpenseDialog(false);
    onOpenChange(false);
    // Naviga alla pagina budget con il fornitore pre-selezionato
    navigate(`/app/budget?createExpense=true&vendorName=${encodeURIComponent(savedVendorData?.name || '')}&categoryId=${savedVendorData?.category_id || ''}`);
  };

  const handleSkipExpense = () => {
    setShowExpenseDialog(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {vendor ? "Modifica Fornitore" : "Nuovo Fornitore"}
            </DialogTitle>
          </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Fornitore *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Es: Fioreria La Rosa"
              maxLength={200}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoria *</Label>
              <Select
                value={categoryId}
                onValueChange={(value) => setValue("category_id", value, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-destructive">{errors.category_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Stato</Label>
              <Select
                value={status}
                onValueChange={(value) => setValue("status", value as VendorFormData["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evaluating">In valutazione</SelectItem>
                  <SelectItem value="booked">Prenotato</SelectItem>
                  <SelectItem value="confirmed">Confermato</SelectItem>
                  <SelectItem value="rejected">Rifiutato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_name">Nome Contatto</Label>
            <Input
              id="contact_name"
              {...register("contact_name")}
              placeholder="Es: Mario Rossi"
              maxLength={200}
            />
            {errors.contact_name && (
              <p className="text-sm text-destructive">{errors.contact_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="contatto@fornitore.it"
                maxLength={255}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                placeholder="+39 123 456 7890"
                maxLength={20}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Appunti, preventivi ricevuti, etc..."
              rows={4}
              maxLength={1000}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Spazio per preventivi, pro/contro, dettagli contrattuali
            </p>
          </div>

          {vendor?.id && (
            <div className="space-y-2">
              <Label>Documenti</Label>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      id="file-upload"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      disabled={uploading}
                      className="hidden"
                    />
                    <Label
                      htmlFor="file-upload"
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? "Caricamento..." : "Carica Documento"}
                    </Label>
                  </div>

                  {uploading && uploadProgress > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Caricamento in corso...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {uploadedFiles.length > 0 ? (
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.path}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <button
                          type="button"
                          onClick={() => handleFileDownload(file.path, file.name)}
                          className="flex items-center gap-2 flex-1 text-left hover:text-primary transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="text-sm truncate">{file.name}</span>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFileDelete(file.path)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nessun documento caricato
                  </p>
                )}

                <div className="pt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <strong>Formati supportati:</strong> PDF, DOC, DOCX, JPG, PNG, WEBP
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Dimensione massima:</strong> 10MB per file
                  </p>
                  {uploading && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ In caso di errori di rete, il sistema riproverà automaticamente
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    
    <AlertDialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Crea Spesa nel Budget</AlertDialogTitle>
          <AlertDialogDescription>
            Hai confermato il fornitore <strong>{savedVendorData?.name}</strong>.
            <br /><br />
            Vuoi creare la relativa voce di spesa nel budget?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSkipExpense}>
            No, più tardi
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleCreateExpense}>
            Sì, crea ora
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
