import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, Smartphone, Type, Palette } from "lucide-react";
import { CampaignConfig, CampaignsConfig } from "./CampaignCard";
import { SaveTheDateView } from "@/components/rsvp/SaveTheDateView";

interface CampaignConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
  campaignType: "save_the_date" | "rsvp";
  currentConfig: CampaignsConfig | null;
  partnerNames: string;
  weddingDate: string;
  onSave: () => void;
}

const CampaignConfigDialog = ({
  open,
  onOpenChange,
  weddingId,
  campaignType,
  currentConfig,
  partnerNames,
  weddingDate,
  onSave,
}: CampaignConfigDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomeText, setWelcomeText] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [weddingLocationState, setWeddingLocationState] = useState("");
  
  // Theme state
  const [fontFamily, setFontFamily] = useState<"serif" | "sans" | "elegant">("serif");
  const [primaryColor, setPrimaryColor] = useState("#D4AF37");

  const isSTD = campaignType === "save_the_date";
  const title = isSTD ? "Configura Save The Date" : "Configura Invito RSVP";

  // Load wedding location
  useEffect(() => {
    const loadWeddingLocation = async () => {
      if (open && weddingId) {
        const { data } = await supabase
          .from("weddings")
          .select("location")
          .eq("id", weddingId)
          .single();
        if (data?.location) {
          setWeddingLocationState(data.location);
        }
      }
    };
    loadWeddingLocation();
  }, [open, weddingId]);

  useEffect(() => {
    if (currentConfig && open) {
      const campaign = currentConfig[campaignType];
      setHeroImageUrl(campaign.hero_image_url);
      setWelcomeTitle(campaign.welcome_title);
      setWelcomeText(campaign.welcome_text);
      setDeadlineDate(campaign.deadline_date || "");
      
      // Theme
      setFontFamily(currentConfig.theme.font_family);
      setPrimaryColor(currentConfig.theme.primary_color);
    }
  }, [currentConfig, open, campaignType]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Tipo file non valido",
        description: "Carica solo immagini (JPG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: "L'immagine deve essere massimo 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${weddingId}/${campaignType}_hero_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("rsvp-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("rsvp-images")
        .getPublicUrl(fileName);

      setHeroImageUrl(publicUrl);
      toast({
        title: "Immagine caricata",
        description: "L'immagine hero è stata caricata con successo",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Errore caricamento",
        description: error.message || "Impossibile caricare l'immagine",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Trim values to avoid saving empty/whitespace-only strings
      const trimmedTitle = welcomeTitle.trim();
      const trimmedText = welcomeText.trim();

      // Build updated config
      const updatedConfig: CampaignsConfig = currentConfig 
        ? { ...currentConfig }
        : {
            save_the_date: {
              status: "draft",
              enabled: true,
              hero_image_url: null,
              welcome_title: "Save The Date!",
              welcome_text: "Segnati questa data!",
              deadline_date: null,
            },
            rsvp: {
              status: "draft",
              enabled: true,
              hero_image_url: null,
              welcome_title: "Conferma la tua Presenza",
              welcome_text: "Non vediamo l'ora di festeggiare con voi!",
              deadline_date: null,
            },
            theme: {
              layout_mode: "immersive_scroll",
              font_family: "serif",
              primary_color: "#D4AF37",
              show_countdown: true,
              show_powered_by: true,
            },
          };

      // Update the specific campaign with trimmed values (fallback to defaults if empty)
      const isSTDCampaign = campaignType === "save_the_date";
      updatedConfig[campaignType] = {
        ...updatedConfig[campaignType],
        hero_image_url: heroImageUrl,
        welcome_title: trimmedTitle || (isSTDCampaign ? "Save The Date!" : "Conferma la tua Presenza"),
        welcome_text: trimmedText || (isSTDCampaign ? "Segnati questa data!" : "Non vediamo l'ora di festeggiare con voi!"),
        deadline_date: deadlineDate || null,
      };

      // Update theme (remove countdown)
      updatedConfig.theme = {
        ...updatedConfig.theme,
        font_family: fontFamily,
        primary_color: primaryColor,
        show_countdown: false, // Always false now
      };

      // Also update wedding location
      const { error: locationError } = await supabase
        .from("weddings")
        .update({ location: weddingLocationState || null })
        .eq("id", weddingId);

      if (locationError) throw locationError;

      const { error } = await supabase
        .from("weddings")
        .update({ campaigns_config: updatedConfig as any })
        .eq("id", weddingId);

      if (error) throw error;

      toast({
        title: "Configurazione salvata",
        description: "Le modifiche sono state salvate con successo",
      });

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare la configurazione",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Personalizza i contenuti e lo stile della pagina che vedranno i tuoi invitati
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content" className="flex items-center gap-1">
                  <Type className="w-4 h-4" />
                  Contenuti
                </TabsTrigger>
                <TabsTrigger value="design" className="flex items-center gap-1">
                  <Palette className="w-4 h-4" />
                  Design
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4">
                {/* Hero Image Upload */}
                <div className="space-y-2">
                  <Label>Immagine di Copertina</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    {heroImageUrl ? (
                      <div className="space-y-2">
                        <img 
                          src={heroImageUrl} 
                          alt="Hero preview" 
                          className="w-full h-32 object-cover rounded-md"
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setHeroImageUrl(null)}
                        >
                          Rimuovi
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                        <div className="flex flex-col items-center gap-2 py-4">
                          {uploading ? (
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Clicca per caricare (max 5MB)
                              </span>
                            </>
                          )}
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Welcome Title */}
                <div className="space-y-2">
                  <Label htmlFor="welcomeTitle">Titolo di Benvenuto</Label>
                  <Input
                    id="welcomeTitle"
                    value={welcomeTitle}
                    onChange={(e) => setWelcomeTitle(e.target.value)}
                    placeholder={isSTD ? "Save The Date!" : "Conferma la tua Presenza"}
                    maxLength={100}
                  />
                </div>

                {/* Welcome Text */}
                <div className="space-y-2">
                  <Label htmlFor="welcomeText">Messaggio di Benvenuto</Label>
                  <Textarea
                    id="welcomeText"
                    value={welcomeText}
                    onChange={(e) => setWelcomeText(e.target.value)}
                    placeholder="Scrivi un messaggio per i tuoi invitati..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                {/* Location (only for STD) */}
                {isSTD && (
                  <div className="space-y-2">
                    <Label htmlFor="weddingLocation">Città del Matrimonio</Label>
                    <Input
                      id="weddingLocation"
                      value={weddingLocationState}
                      onChange={(e) => setWeddingLocationState(e.target.value)}
                      placeholder="Es: Roma, Italia"
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Verrà mostrata sotto la data nella pagina Save The Date
                    </p>
                  </div>
                )}

                {/* Deadline (only for RSVP) */}
                {!isSTD && (
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Scadenza RSVP</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Dopo questa data, gli invitati non potranno più rispondere
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="design" className="space-y-4 mt-4">
                {/* Font Family */}
                <div className="space-y-2">
                  <Label>Stile Tipografico</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "serif", label: "Classico", sample: "Aa" },
                      { value: "sans", label: "Moderno", sample: "Aa" },
                      { value: "elegant", label: "Elegante", sample: "Aa" },
                    ].map((font) => (
                      <button
                        key={font.value}
                        onClick={() => setFontFamily(font.value as any)}
                        className={`p-3 border rounded-lg text-center transition-all ${
                          fontFamily === font.value 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className={`text-2xl block mb-1 ${
                          font.value === "serif" ? "font-serif" :
                          font.value === "sans" ? "font-sans" :
                          "font-serif italic"
                        }`}>
                          {font.sample}
                        </span>
                        <span className="text-xs text-muted-foreground">{font.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Color */}
                <div className="space-y-2">
                  <Label>Colore Principale</Label>
                  <div className="flex gap-2">
                    {["#D4AF37", "#B76E79", "#5B8C5A", "#6B5B95", "#003366"].map((color) => (
                      <button
                        key={color}
                        onClick={() => setPrimaryColor(color)}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          primaryColor === color 
                            ? "border-foreground scale-110" 
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-full cursor-pointer"
                    />
                  </div>
                </div>

              </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  "Salva Configurazione"
                )}
              </Button>
            </div>
          </div>

          {/* Live Preview Panel - Real SaveTheDateView Component */}
          <div className="hidden md:block">
            <div className="sticky top-0">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Anteprima Mobile (Interattiva)</span>
              </div>
              
              {/* Phone Frame with Real Component */}
              <div className="mx-auto w-[300px] h-[550px] bg-black border-4 border-foreground/20 rounded-[2rem] overflow-hidden shadow-xl">
                <div className="w-full h-full overflow-y-auto transform scale-[0.55] origin-top-left" style={{ width: "182%", height: "182%" }}>
                  {isSTD ? (
                    <SaveTheDateView
                      coupleName={partnerNames || "Marco & Giulia"}
                      weddingDate={weddingDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      weddingLocation={weddingLocationState || "Roma, Italia"}
                      guestFirstName="Mario"
                      guestLastName="Rossi"
                      heroImageUrl={heroImageUrl}
                      welcomeTitle={welcomeTitle || "Save The Date!"}
                      welcomeText={welcomeText || "Un capitolo d'amore ci aspetta, e vorremmo tu fossi parte di questa storia."}
                      isReadOnly={false}
                      isPreview={true}
                      theme={{
                        font_family: fontFamily,
                        primary_color: primaryColor,
                        show_countdown: false,
                      }}
                      onSubmitResponse={async () => {
                        toast({ title: "Anteprima", description: "Questo è solo un test!" });
                      }}
                    />
                  ) : (
                    // RSVP Preview - simplified mockup for now
                    <div className="min-h-screen bg-background">
                      {heroImageUrl && (
                        <div className="h-48 w-full overflow-hidden">
                          <img src={heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-6 space-y-4">
                        <h1 
                          className={`text-2xl font-bold text-center ${
                            fontFamily === "serif" ? "font-serif" :
                            fontFamily === "sans" ? "font-sans" :
                            "font-serif italic"
                          }`}
                          style={{ color: primaryColor }}
                        >
                          {partnerNames || "Marco & Giulia"}
                        </h1>
                        <p className="text-center text-muted-foreground">
                          {weddingDate 
                            ? new Date(weddingDate).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
                            : "14 Giugno 2026"
                          }
                        </p>
                        <div className="bg-muted/30 rounded-lg p-4 text-center">
                          <h2 className="font-semibold mb-2">{welcomeTitle || "Conferma la tua Presenza"}</h2>
                          <p className="text-sm text-muted-foreground">{welcomeText || "Non vediamo l'ora di festeggiare con voi!"}</p>
                        </div>
                        <div className="space-y-3">
                          <div className="border rounded-lg p-3">
                            <p className="text-sm font-medium mb-2">Mario Rossi</p>
                            <div className="flex gap-2">
                              <button className="flex-1 py-2 rounded border text-sm hover:bg-muted transition-colors">Ci sarò</button>
                              <button className="flex-1 py-2 rounded border text-sm hover:bg-muted transition-colors">Non ci sarò</button>
                            </div>
                          </div>
                        </div>
                        <button 
                          className="w-full py-3 rounded-lg text-white font-medium"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Conferma Presenza
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignConfigDialog;
