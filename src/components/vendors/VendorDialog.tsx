import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const emptyVendor: Vendor = {
  name: "",
  contact_name: null,
  email: null,
  phone: null,
  status: "evaluating",
  notes: null,
  category_id: null,
};

const statusOptions = [
  { value: "evaluating", label: "Valutazione" },
  { value: "booked", label: "Prenotato" },
  { value: "paid", label: "Pagato" },
  { value: "excluded", label: "Escluso" },
];

export function VendorDialog({
  open,
  onOpenChange,
  vendor,
  categories,
  onSave,
}: VendorDialogProps) {
  const [formData, setFormData] = useState<Vendor>(emptyVendor);
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; path: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (vendor) {
      setFormData(vendor);
      loadExistingFiles(vendor.id!);
    } else {
      setFormData(emptyVendor);
      setUploadedFiles([]);
    }
  }, [vendor, open]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !vendor?.id) return;

    setUploading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("User not authenticated");

      const file = files[0];
      const filePath = `${user.user.id}/${vendor.id}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("vendor-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

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
      toast({
        title: "Errore caricamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving vendor:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {vendor ? "Modifica Fornitore" : "Nuovo Fornitore"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Fornitore *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Es: Fioreria La Rosa"
              required
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoria</Label>
              <Select
                value={formData.category_id || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    category_id: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Stato *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_name">Nome Contatto</Label>
            <Input
              id="contact_name"
              value={formData.contact_name || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact_name: e.target.value || null,
                })
              }
              placeholder="Es: Mario Rossi"
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value || null })
                }
                placeholder="contatto@fornitore.it"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value || null })
                }
                placeholder="+39 123 456 7890"
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value || null })
              }
              placeholder="Appunti, preventivi ricevuti, etc..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              Spazio per preventivi, pro/contro, dettagli contrattuali
            </p>
          </div>

          {vendor?.id && (
            <div className="space-y-2">
              <Label>Documenti</Label>
              <div className="border rounded-lg p-4 space-y-3">
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
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Caricamento..." : "Carica Documento"}
                  </Label>
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

                <p className="text-xs text-muted-foreground">
                  Formati supportati: PDF, DOC, DOCX, JPG, PNG, WEBP (max 10MB)
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
