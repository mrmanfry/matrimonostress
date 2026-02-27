import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, Smartphone, Type, Palette, MapPin, HelpCircle, Plus, Trash2, Sparkles, Gift, Copy, ExternalLink } from "lucide-react";
import { CampaignConfig, CampaignsConfig, FAQItem, GiftInfo } from "./CampaignCard";
import { SaveTheDateView } from "@/components/rsvp/SaveTheDateView";
import { FormalInviteView } from "@/components/rsvp/FormalInviteView";

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
  const [generatingFaqs, setGeneratingFaqs] = useState(false);
  
  // Form state
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomeText, setWelcomeText] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [weddingLocationState, setWeddingLocationState] = useState("");
  
  // Theme state
  const [fontFamily, setFontFamily] = useState<"serif" | "sans" | "elegant">("serif");
  const [primaryColor, setPrimaryColor] = useState("#D4AF37");

  // Location state (RSVP only)
  const [ceremonyVenueName, setCeremonyVenueName] = useState("");
  const [ceremonyVenueAddress, setCeremonyVenueAddress] = useState("");
  const [receptionVenueName, setReceptionVenueName] = useState("");
  const [receptionVenueAddress, setReceptionVenueAddress] = useState("");
  const [receptionStartTime, setReceptionStartTime] = useState("");
  const [ceremonyStartTimeState, setCeremonyStartTimeState] = useState("");

  // FAQ state
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  // Gift Info state
  const [giftEnabled, setGiftEnabled] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [giftCoupleNames, setGiftCoupleNames] = useState("");
  const [giftIban, setGiftIban] = useState("");
  const [giftBicSwift, setGiftBicSwift] = useState("");
  const [giftBankName, setGiftBankName] = useState("");
  const [giftAccountHolder, setGiftAccountHolder] = useState("");
  const [giftRegistryUrl, setGiftRegistryUrl] = useState("");

  const isSTD = campaignType === "save_the_date";
  const title = isSTD ? "Configura Save The Date" : "Configura Invito RSVP";

  // Load wedding location and venue details
  useEffect(() => {
    const loadWeddingDetails = async () => {
      if (open && weddingId) {
        const { data } = await supabase
          .from("weddings")
          .select("location, ceremony_venue_name, ceremony_venue_address, ceremony_start_time, reception_venue_name, reception_venue_address, reception_start_time")
          .eq("id", weddingId)
          .single();
        if (data) {
          setWeddingLocationState(data.location || "");
          setCeremonyVenueName(data.ceremony_venue_name || "");
          setCeremonyVenueAddress(data.ceremony_venue_address || "");
          setCeremonyStartTimeState(data.ceremony_start_time || "");
          setReceptionVenueName(data.reception_venue_name || "");
          setReceptionVenueAddress(data.reception_venue_address || "");
          setReceptionStartTime(data.reception_start_time || "");
        }
      }
    };
    loadWeddingDetails();
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

      // FAQ
      setFaqs(campaign.faqs || []);

      // Gift Info
      const gi = campaign.gift_info;
      if (gi) {
        setGiftEnabled(gi.enabled);
        setGiftMessage(gi.message || "");
        setGiftCoupleNames(gi.couple_names || "");
        setGiftIban(gi.iban || "");
        setGiftBicSwift(gi.bic_swift || "");
        setGiftBankName(gi.bank_name || "");
        setGiftAccountHolder(gi.account_holder || "");
        setGiftRegistryUrl(gi.registry_url || "");
      } else {
        setGiftEnabled(false);
        setGiftMessage("Il regalo più grande sarà avervi con noi per condividere questo giorno speciale.");
        setGiftCoupleNames(partnerNames);
        setGiftIban("");
        setGiftBicSwift("");
        setGiftBankName("");
        setGiftAccountHolder("");
        setGiftRegistryUrl("");
      }
    }
  }, [currentConfig, open, campaignType, partnerNames]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Tipo file non valido", description: "Carica solo immagini (JPG, PNG, WebP)", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File troppo grande", description: "L'immagine deve essere massimo 5MB", variant: "destructive" });
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
      toast({ title: "Immagine caricata", description: "L'immagine hero è stata caricata con successo" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Errore caricamento", description: error.message || "Impossibile caricare l'immagine", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // FAQ handlers
  const handleAddFaq = () => {
    setFaqs(prev => [...prev, { question: "", answer: "" }]);
  };

  const handleUpdateFaq = (index: number, field: "question" | "answer", value: string) => {
    setFaqs(prev => prev.map((faq, i) => i === index ? { ...faq, [field]: value } : faq));
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateFaqs = async () => {
    setGeneratingFaqs(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-rsvp-faqs", {
        body: { weddingId },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Errore AI", description: data.error, variant: "destructive" });
        return;
      }

      if (data?.faqs?.length) {
        setFaqs(prev => [...prev, ...data.faqs]);
        toast({ title: "FAQ generate!", description: `${data.faqs.length} FAQ aggiunte con successo` });
      }
    } catch (error: any) {
      console.error("FAQ generation error:", error);
      toast({ title: "Errore", description: "Impossibile generare le FAQ", variant: "destructive" });
    } finally {
      setGeneratingFaqs(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmedTitle = welcomeTitle.trim();
      const trimmedText = welcomeText.trim();

      const updatedConfig: CampaignsConfig = currentConfig 
        ? { ...currentConfig }
        : {
            save_the_date: {
              status: "draft", enabled: true, hero_image_url: null,
              welcome_title: "Save The Date!", welcome_text: "Segnati questa data!", deadline_date: null,
            },
            rsvp: {
              status: "draft", enabled: true, hero_image_url: null,
              welcome_title: "Conferma la tua Presenza", welcome_text: "Non vediamo l'ora di festeggiare con voi!", deadline_date: null,
            },
            theme: {
              layout_mode: "immersive_scroll", font_family: "serif",
              primary_color: "#D4AF37", show_countdown: true, show_powered_by: true,
            },
          };

      const isSTDCampaign = campaignType === "save_the_date";
      updatedConfig[campaignType] = {
        ...updatedConfig[campaignType],
        hero_image_url: heroImageUrl,
        welcome_title: trimmedTitle || (isSTDCampaign ? "Save The Date!" : "Conferma la tua Presenza"),
        welcome_text: trimmedText || (isSTDCampaign ? "Segnati questa data!" : "Non vediamo l'ora di festeggiare con voi!"),
        deadline_date: deadlineDate || null,
        faqs: faqs.filter(f => f.question.trim() && f.answer.trim()),
        gift_info: {
          enabled: giftEnabled,
          message: giftMessage,
          couple_names: giftCoupleNames || partnerNames,
          iban: giftIban,
          bic_swift: giftBicSwift,
          bank_name: giftBankName,
          account_holder: giftAccountHolder,
          registry_url: giftRegistryUrl || null,
        },
      };

      updatedConfig.theme = {
        ...updatedConfig.theme,
        font_family: fontFamily,
        primary_color: primaryColor,
        show_countdown: false,
      };

      const venueUpdate: Record<string, any> = {
        location: weddingLocationState || null,
      };

      if (!isSTDCampaign) {
        venueUpdate.ceremony_venue_name = ceremonyVenueName || null;
        venueUpdate.ceremony_venue_address = ceremonyVenueAddress || null;
        venueUpdate.ceremony_start_time = ceremonyStartTimeState || null;
        venueUpdate.reception_venue_name = receptionVenueName || null;
        venueUpdate.reception_venue_address = receptionVenueAddress || null;
        venueUpdate.reception_start_time = receptionStartTime || null;
      }

      const { error: locationError } = await supabase
        .from("weddings")
        .update(venueUpdate)
        .eq("id", weddingId);

      if (locationError) throw locationError;

      const { error } = await supabase
        .from("weddings")
        .update({ campaigns_config: updatedConfig as any })
        .eq("id", weddingId);

      if (error) throw error;

      toast({ title: "Configurazione salvata", description: "Le modifiche sono state salvate con successo" });
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Errore", description: error.message || "Impossibile salvare la configurazione", variant: "destructive" });
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
              <TabsList className={`grid w-full ${isSTD ? 'grid-cols-2' : 'grid-cols-4'}`}>
                <TabsTrigger value="content" className="flex items-center gap-1">
                  <Type className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Contenuti</span>
                  <span className="sm:hidden">📝</span>
                </TabsTrigger>
                {!isSTD && (
                  <TabsTrigger value="location" className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Location</span>
                    <span className="sm:hidden">📍</span>
                  </TabsTrigger>
                )}
                {!isSTD && (
                  <TabsTrigger value="faq" className="flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">FAQ</span>
                    <span className="sm:hidden">❓</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="design" className="flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Design</span>
                  <span className="sm:hidden">🎨</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4">
                {/* Hero Image Upload */}
                <div className="space-y-2">
                  <Label>Immagine di Copertina</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    {heroImageUrl ? (
                      <div className="space-y-2">
                        <img src={heroImageUrl} alt="Hero preview" className="w-full h-32 object-cover rounded-md" />
                        <Button variant="outline" size="sm" onClick={() => setHeroImageUrl(null)}>Rimuovi</Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                        <div className="flex flex-col items-center gap-2 py-4">
                          {uploading ? (
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Clicca per caricare (max 5MB)</span>
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

                {/* Lista Nozze Section (RSVP only) */}
                {!isSTD && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-base font-medium">
                        <Gift className="w-4 h-4" />
                        Lista Nozze
                      </Label>
                      <Switch checked={giftEnabled} onCheckedChange={setGiftEnabled} />
                    </div>

                    {giftEnabled && (
                      <div className="space-y-3 pl-1">
                        <div className="space-y-2">
                          <Label htmlFor="giftMessage">Messaggio</Label>
                          <Textarea
                            id="giftMessage"
                            value={giftMessage}
                            onChange={(e) => setGiftMessage(e.target.value)}
                            placeholder="Il regalo più grande sarà avervi con noi..."
                            rows={2}
                            maxLength={500}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="giftCoupleNames">Intestatario / Nomi Coppia</Label>
                          <Input
                            id="giftCoupleNames"
                            value={giftCoupleNames}
                            onChange={(e) => setGiftCoupleNames(e.target.value)}
                            placeholder="Mario Rossi & Giulia Bianchi"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="giftIban">IBAN</Label>
                          <Input
                            id="giftIban"
                            value={giftIban}
                            onChange={(e) => setGiftIban(e.target.value)}
                            placeholder="IT60X0542811101000000123456"
                            maxLength={34}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor="giftBicSwift">BIC/SWIFT</Label>
                            <Input
                              id="giftBicSwift"
                              value={giftBicSwift}
                              onChange={(e) => setGiftBicSwift(e.target.value)}
                              placeholder="BPPIITRRXXX"
                              maxLength={11}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="giftBankName">Banca</Label>
                            <Input
                              id="giftBankName"
                              value={giftBankName}
                              onChange={(e) => setGiftBankName(e.target.value)}
                              placeholder="Intesa Sanpaolo"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="giftRegistryUrl">Link Lista Nozze (opzionale)</Label>
                          <Input
                            id="giftRegistryUrl"
                            type="url"
                            value={giftRegistryUrl}
                            onChange={(e) => setGiftRegistryUrl(e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Location Tab (RSVP only) */}
              {!isSTD && (
                <TabsContent value="location" className="space-y-4 mt-4">
                  {/* Ceremony Section */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <span className="text-lg">⛪</span> La Cerimonia
                    </h4>
                    <div className="space-y-2">
                      <Label htmlFor="ceremonyVenueName">Nome Location</Label>
                      <Input id="ceremonyVenueName" value={ceremonyVenueName} onChange={(e) => setCeremonyVenueName(e.target.value)} placeholder="Es: Cattedrale di Trani" maxLength={100} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ceremonyVenueAddress">Indirizzo</Label>
                      <Input id="ceremonyVenueAddress" value={ceremonyVenueAddress} onChange={(e) => setCeremonyVenueAddress(e.target.value)} placeholder="Es: Piazza Duomo 1, Trani" maxLength={200} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ceremonyStartTime">Orario Cerimonia</Label>
                      <Input id="ceremonyStartTime" type="time" value={ceremonyStartTimeState} onChange={(e) => setCeremonyStartTimeState(e.target.value)} />
                    </div>
                  </div>

                  {/* Reception Section */}
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <span className="text-lg">🎉</span> Il Ricevimento
                    </h4>
                    <div className="space-y-2">
                      <Label htmlFor="receptionVenueName">Nome Location</Label>
                      <Input id="receptionVenueName" value={receptionVenueName} onChange={(e) => setReceptionVenueName(e.target.value)} placeholder="Es: Tenuta Montevitolo" maxLength={100} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receptionVenueAddress">Indirizzo</Label>
                      <Input id="receptionVenueAddress" value={receptionVenueAddress} onChange={(e) => setReceptionVenueAddress(e.target.value)} placeholder="Es: Via Vecchia Spinazzola Km 9,200, Andria" maxLength={200} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receptionStartTime">Orario Ricevimento</Label>
                      <Input id="receptionStartTime" type="time" value={receptionStartTime} onChange={(e) => setReceptionStartTime(e.target.value)} />
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* FAQ Tab (RSVP only) */}
              {!isSTD && (
                <TabsContent value="faq" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">Info Utili / FAQ</h4>
                      <p className="text-xs text-muted-foreground">Domande frequenti per i tuoi invitati</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateFaqs}
                      disabled={generatingFaqs}
                    >
                      {generatingFaqs ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1" />
                      )}
                      Genera con AI
                    </Button>
                  </div>

                  {/* FAQ List */}
                  <div className="space-y-3">
                    {faqs.map((faq, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <Input
                              value={faq.question}
                              onChange={(e) => handleUpdateFaq(index, "question", e.target.value)}
                              placeholder="Domanda..."
                              maxLength={300}
                              className="font-medium"
                            />
                            <Textarea
                              value={faq.answer}
                              onChange={(e) => handleUpdateFaq(index, "answer", e.target.value)}
                              placeholder="Risposta..."
                              rows={2}
                              maxLength={1000}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFaq(index)}
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" onClick={handleAddFaq} className="w-full">
                    <Plus className="w-4 h-4 mr-1" />
                    Aggiungi FAQ
                  </Button>
                </TabsContent>
              )}

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

          {/* Live Preview Panel */}
          <div className="hidden md:block">
            <div className="sticky top-0">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Anteprima Mobile (Interattiva)</span>
              </div>
              
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
                    <FormalInviteView
                      coupleName={partnerNames || "Marco & Giulia"}
                      weddingDate={weddingDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      ceremonyVenueName={ceremonyVenueName || "Cattedrale di Trani"}
                      ceremonyVenueAddress={ceremonyVenueAddress || "Piazza Duomo 1, Trani"}
                      ceremonyStartTime={ceremonyStartTimeState || "16:00"}
                      receptionVenueName={receptionVenueName || "Tenuta Montevitolo"}
                      receptionVenueAddress={receptionVenueAddress || "Via Vecchia Spinazzola Km 9,200, Andria"}
                      receptionStartTime={receptionStartTime || "19:00"}
                      guestFirstName="Mario"
                      isSingleGuest={false}
                      partyName="Famiglia Rossi"
                      members={[
                        { id: "1", first_name: "Mario", last_name: "Rossi", is_child: false, allow_plus_one: true, rsvp_status: "pending", menu_choice: null, dietary_restrictions: null, plus_one_name: null, plus_one_menu: null },
                        { id: "2", first_name: "Laura", last_name: "Rossi", is_child: false, allow_plus_one: false, rsvp_status: "pending", menu_choice: null, dietary_restrictions: null, plus_one_name: null, plus_one_menu: null },
                      ]}
                      heroImageUrl={heroImageUrl}
                      welcomeTitle={welcomeTitle || "Conferma la tua Presenza"}
                      welcomeText={welcomeText || "Non vediamo l'ora di festeggiare con voi!"}
                      theme={{
                        font_family: fontFamily,
                        primary_color: primaryColor,
                        show_countdown: false,
                      }}
                      isPreview={true}
                      faqs={faqs.filter(f => f.question.trim() && f.answer.trim())}
                      giftInfo={giftEnabled ? {
                        enabled: true,
                        message: giftMessage,
                        couple_names: giftCoupleNames || partnerNames,
                        iban: giftIban || "IT60X0542811101000000123456",
                        bic_swift: giftBicSwift,
                        bank_name: giftBankName,
                        account_holder: giftAccountHolder,
                        registry_url: giftRegistryUrl || null,
                      } : undefined}
                      memberData={{}}
                      onMemberDataChange={() => {}}
                      onSubmit={async () => {
                        toast({ title: "Anteprima", description: "Questo è solo un test!" });
                      }}
                      submitting={false}
                      submitted={false}
                    />
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
