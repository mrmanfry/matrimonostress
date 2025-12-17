import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X, Image as ImageIcon, Calendar, Type, MessageSquare, Eye } from "lucide-react";

interface RSVPConfig {
  hero_image_url: string | null;
  welcome_title: string;
  welcome_text: string;
  deadline_date: string | null;
}

interface RSVPConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
  currentConfig: RSVPConfig | null;
  onSave: () => void;
}

export function RSVPConfigDialog({
  open,
  onOpenChange,
  weddingId,
  currentConfig,
  onSave,
}: RSVPConfigDialogProps) {
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [welcomeTitle, setWelcomeTitle] = useState("Benvenuti al nostro Matrimonio");
  const [welcomeText, setWelcomeText] = useState("Non vediamo l'ora di festeggiare con voi!");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setHeroImageUrl(currentConfig.hero_image_url || "");
      setWelcomeTitle(currentConfig.welcome_title || "Benvenuti al nostro Matrimonio");
      setWelcomeText(currentConfig.welcome_text || "Non vediamo l'ora di festeggiare con voi!");
      setDeadlineDate(currentConfig.deadline_date || "");
    }
  }, [currentConfig, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un file immagine valido");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'immagine deve essere inferiore a 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `rsvp-hero-${weddingId}-${Date.now()}.${fileExt}`;
      const filePath = `${weddingId}/${fileName}`;

      // Check if bucket exists, if not we'll use a data URL
      const { error: uploadError } = await supabase.storage
        .from("vendor-documents")
        .upload(filePath, file);

      if (uploadError) {
        // Fallback to data URL if storage fails
        const reader = new FileReader();
        reader.onloadend = () => {
          setHeroImageUrl(reader.result as string);
          toast.success("Immagine caricata (anteprima locale)");
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from("vendor-documents")
        .getPublicUrl(filePath);

      setHeroImageUrl(publicUrl.publicUrl);
      toast.success("Immagine caricata con successo");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Errore nel caricamento dell'immagine");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config = {
        hero_image_url: heroImageUrl || null,
        welcome_title: welcomeTitle,
        welcome_text: welcomeText,
        deadline_date: deadlineDate || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from("weddings")
        .update({ rsvp_config: config as any })
        .eq("id", weddingId);

      if (error) throw error;

      toast.success("Configurazione RSVP salvata");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Configura Landing Page RSVP
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Hero Image */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Immagine Hero (opzionale)
            </Label>
            <p className="text-sm text-muted-foreground">
              Un'immagine di copertina che apparirà nella landing page RSVP
            </p>
            
            {heroImageUrl ? (
              <div className="relative">
                <img
                  src={heroImageUrl}
                  alt="Hero preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setHeroImageUrl("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Clicca per caricare un'immagine
                      </p>
                    </>
                  )}
                </div>
              </label>
            )}
          </div>

          {/* Welcome Title */}
          <div className="space-y-2">
            <Label htmlFor="welcome-title" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Titolo di Benvenuto
            </Label>
            <Input
              id="welcome-title"
              value={welcomeTitle}
              onChange={(e) => setWelcomeTitle(e.target.value)}
              placeholder="Benvenuti al nostro Matrimonio"
              maxLength={100}
            />
          </div>

          {/* Welcome Text */}
          <div className="space-y-2">
            <Label htmlFor="welcome-text">Messaggio di Benvenuto</Label>
            <Textarea
              id="welcome-text"
              value={welcomeText}
              onChange={(e) => setWelcomeText(e.target.value)}
              placeholder="Non vediamo l'ora di festeggiare con voi!"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Limite RSVP (opzionale)
            </Label>
            <p className="text-sm text-muted-foreground">
              Dopo questa data, il form RSVP diventerà di sola lettura
            </p>
            <Input
              id="deadline"
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
            />
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <p className="text-sm font-medium mb-3">Anteprima</p>
            <div className="space-y-2">
              {heroImageUrl && (
                <div className="h-20 rounded overflow-hidden">
                  <img
                    src={heroImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="font-semibold">{welcomeTitle || "Titolo"}</h3>
              <p className="text-sm text-muted-foreground">{welcomeText || "Messaggio"}</p>
              {deadlineDate && (
                <p className="text-xs text-muted-foreground">
                  ⏰ Rispondi entro il {new Date(deadlineDate).toLocaleDateString("it-IT")}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/rsvp/preview", "_blank")}
              className="mt-2"
            >
              <Eye className="w-4 h-4 mr-2" />
              Vedi Anteprima Completa
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salva Configurazione
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
