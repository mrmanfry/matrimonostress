import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Send, SkipForward, Upload, X, Filter, Phone, AlertCircle, Users, CheckCircle, PhoneOff, Settings, Link2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  unique_rsvp_token: string | null;
  rsvp_invitation_sent: string | null;
  party_id: string | null;
  group_id: string | null;
  is_child: boolean;
}

interface InviteParty {
  id: string;
  party_name: string;
  rsvp_status?: string;
}

interface GuestGroup {
  id: string;
  name: string;
}

interface RSVPConfig {
  hero_image_url?: string | null;
  welcome_title?: string;
  welcome_text?: string;
  deadline_date?: string | null;
}

interface RSVPCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedParties: InviteParty[];
  weddingId: string;
  coupleName: string;
}

type FilterType = "to_send" | "already_sent" | "no_phone";

export function RSVPCampaignDialog({
  open,
  onOpenChange,
  selectedParties,
  weddingId,
  coupleName,
}: RSVPCampaignDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"filter" | "template" | "sending">("filter");
  const [activeFilter, setActiveFilter] = useState<FilterType>("to_send");
  const [messageTemplate, setMessageTemplate] = useState(
    `Ciao [NomeInvitato]! 👋\n\nSiamo felici di invitarti al matrimonio di [NomeCoppia]! 💍\n\nConferma la tua presenza tramite questo link:\n[LINK_RSVP]\n\nGrazie! ❤️`
  );
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [whatsappOpened, setWhatsappOpened] = useState(false);
  const [allParties, setAllParties] = useState<InviteParty[]>([]);
  const [allGroups, setAllGroups] = useState<GuestGroup[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [rsvpConfig, setRsvpConfig] = useState<RSVPConfig | null>(null);
  const [isRsvpConfigured, setIsRsvpConfigured] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadAllData();
    } else {
      setStep("filter");
      setActiveFilter("to_send");
      setSelectedPartyId(null);
      setSelectedGroupId(null);
      setSelectedGuestIds(new Set());
    }
  }, [open, weddingId]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedGuestIds(new Set());
  }, [activeFilter, selectedPartyId, selectedGroupId]);

  const loadAllData = async () => {
    // Load all parties
    const { data: parties } = await supabase
      .from("invite_parties")
      .select("id, party_name, rsvp_status")
      .eq("wedding_id", weddingId);
    setAllParties(parties || []);

    // Load all groups
    const { data: groups } = await supabase
      .from("guest_groups")
      .select("id, name")
      .eq("wedding_id", weddingId)
      .order("name");
    setAllGroups(groups || []);

    // Load RSVP config from wedding
    const { data: wedding } = await supabase
      .from("weddings")
      .select("rsvp_config")
      .eq("id", weddingId)
      .single();
    
    if (wedding?.rsvp_config) {
      const config = wedding.rsvp_config as RSVPConfig;
      setRsvpConfig(config);
      // Consider RSVP configured if it has at least a welcome title or welcome text
      setIsRsvpConfigured(Boolean(config.welcome_title || config.welcome_text));
    } else {
      setRsvpConfig(null);
      setIsRsvpConfigured(false);
    }

    // Load ALL guests for the wedding (not filtered by party)
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId)
      .eq("is_child", false) // Only adults can receive messages
      .order("first_name");

    if (error) {
      toast.error("Errore nel caricamento degli invitati");
      console.error(error);
      return;
    }

    setAllGuests(data || []);
  };

  // Apply party and group filters first
  const preFilteredGuests = useMemo(() => {
    let result = allGuests;
    
    if (selectedPartyId) {
      result = result.filter(g => g.party_id === selectedPartyId);
    }
    
    if (selectedGroupId) {
      result = result.filter(g => g.group_id === selectedGroupId);
    }
    
    return result;
  }, [allGuests, selectedPartyId, selectedGroupId]);

  // Filter stats based on pre-filtered guests
  const filterStats = useMemo(() => {
    const withPhone = preFilteredGuests.filter(g => g.phone && g.phone.trim() !== "");
    const toSend = withPhone.filter(g => !g.rsvp_invitation_sent);
    const alreadySent = withPhone.filter(g => !!g.rsvp_invitation_sent);
    const noPhone = preFilteredGuests.filter(g => !g.phone || g.phone.trim() === "");
    
    return {
      to_send: toSend.length,
      already_sent: alreadySent.length,
      no_phone: noPhone.length,
      total_with_phone: withPhone.length,
    };
  }, [preFilteredGuests]);

  // Apply status filter on top of party/group filters
  const filteredGuests = useMemo(() => {
    switch (activeFilter) {
      case "to_send":
        return preFilteredGuests.filter(g => 
          g.phone && g.phone.trim() !== "" && !g.rsvp_invitation_sent
        );
      case "already_sent":
        return preFilteredGuests.filter(g => 
          g.phone && g.phone.trim() !== "" && !!g.rsvp_invitation_sent
        );
      case "no_phone":
        return preFilteredGuests.filter(g => !g.phone || g.phone.trim() === "");
      default:
        return [];
    }
  }, [preFilteredGuests, activeFilter]);

  const generateAIMessage = async () => {
    setIsGeneratingAI(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-rsvp-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ coupleName }),
      });

      if (!response.ok) throw new Error("Errore nella generazione");

      const { message } = await response.json();
      setMessageTemplate(message);
      toast.success("Messaggio generato con AI!");
    } catch (error) {
      toast.error("Errore nella generazione del messaggio");
      console.error(error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContinueToTemplate = () => {
    if (!isRsvpConfigured) {
      return;
    }
    if (selectedGuestIds.size === 0) {
      toast.error("Seleziona almeno un invitato");
      return;
    }
    setStep("template");
  };

  const goToSettings = () => {
    onOpenChange(false);
    navigate("/app/settings");
  };

  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuestIds(prev => {
      const next = new Set(prev);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });
  };

  const selectAllGuests = () => {
    setSelectedGuestIds(new Set(filteredGuests.map(g => g.id)));
  };

  const deselectAllGuests = () => {
    setSelectedGuestIds(new Set());
  };

  const selectedGuests = useMemo(() => {
    return filteredGuests.filter(g => selectedGuestIds.has(g.id));
  }, [filteredGuests, selectedGuestIds]);

  const startSending = () => {
    if (selectedGuests.length === 0) {
      toast.error("Nessun invitato selezionato");
      return;
    }
    setGuests(selectedGuests);
    setStep("sending");
    setCurrentIndex(0);
    setWhatsappOpened(false);
  };

  const prepareWhatsAppMessage = () => {
    const currentGuest = guests[currentIndex];
    if (!currentGuest) return;

    const guestName = `${currentGuest.first_name} ${currentGuest.last_name}`;
    const rsvpLink = `${window.location.origin}/rsvp/${currentGuest.unique_rsvp_token}`;

    let message = messageTemplate
      .replace(/\[NomeInvitato\]/g, guestName)
      .replace(/\[LINK_RSVP\]/g, rsvpLink)
      .replace(/\[NomeCoppia\]/g, coupleName);

    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = currentGuest.phone?.replace(/[^0-9]/g, "");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
    setWhatsappOpened(true);
  };

  const markAsSent = async () => {
    const currentGuest = guests[currentIndex];
    if (!currentGuest) return;

    const { error } = await supabase
      .from("guests")
      .update({ rsvp_invitation_sent: new Date().toISOString() })
      .eq("id", currentGuest.id);

    if (error) {
      toast.error("Errore nell'aggiornamento dello stato");
      console.error(error);
      return;
    }

    // Move to next guest
    if (currentIndex < guests.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setWhatsappOpened(false);
    } else {
      toast.success("Campagna completata! 🎉");
      onOpenChange(false);
    }
  };

  const skipGuest = async () => {
    if (currentIndex < guests.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setWhatsappOpened(false);
    } else {
      toast.success("Campagna completata!");
      onOpenChange(false);
    }
  };

  const currentGuest = guests[currentIndex];
  const progress = guests.length > 0 ? ((currentIndex / guests.length) * 100) : 0;
  const rsvpDomain = `${window.location.origin}/rsvp/`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">💬 Assistente Invio RSVP</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Progress */}
          {step === "sending" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{currentIndex} / {guests.length} messaggi preparati</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {step === "filter" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Passo 1: Seleziona Chi Contattare
                </h3>

                {/* RSVP Configuration Warning */}
                {!isRsvpConfigured && (
                  <Alert variant="destructive" className="mb-4">
                    <Settings className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        La pagina RSVP non è ancora configurata. Vai nelle Impostazioni per personalizzare il messaggio di benvenuto.
                      </span>
                      <Button variant="outline" size="sm" onClick={goToSettings} className="ml-4 shrink-0">
                        <Settings className="w-4 h-4 mr-2" />
                        Vai a Impostazioni
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Alert if no guests have phone */}
                {filterStats.total_with_phone === 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <PhoneOff className="h-4 w-4" />
                    <AlertDescription>
                      Nessun invitato ha un numero di telefono registrato. Aggiungi i numeri dalla pagina Invitati prima di avviare la campagna.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Filters for Party and Group */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filtra per</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nucleo Familiare</label>
                      <Select 
                        value={selectedPartyId || "all"} 
                        onValueChange={(v) => setSelectedPartyId(v === "all" ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tutti i nuclei" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti i nuclei</SelectItem>
                          {allParties.map((party) => (
                            <SelectItem key={party.id} value={party.id}>
                              {party.party_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Gruppo</label>
                      <Select 
                        value={selectedGroupId || "all"} 
                        onValueChange={(v) => setSelectedGroupId(v === "all" ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tutti i gruppi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti i gruppi</SelectItem>
                          {allGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {(selectedPartyId || selectedGroupId) && (
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {preFilteredGuests.length} invitati filtrati
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs"
                        onClick={() => {
                          setSelectedPartyId(null);
                          setSelectedGroupId(null);
                        }}
                      >
                        Rimuovi filtri
                      </Button>
                    </div>
                  )}
                </div>
                
                <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="to_send" className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Da Inviare
                      <Badge variant="secondary" className="ml-1">{filterStats.to_send}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="already_sent" className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Già Inviati
                      <Badge variant="secondary" className="ml-1">{filterStats.already_sent}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="no_phone" className="flex items-center gap-2">
                      <PhoneOff className="w-4 h-4" />
                      Senza Tel.
                      <Badge variant="destructive" className="ml-1">{filterStats.no_phone}</Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Selection Controls */}
                {filteredGuests.length > 0 && activeFilter === "to_send" && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={selectAllGuests}
                        disabled={selectedGuestIds.size === filteredGuests.length}
                      >
                        Seleziona tutti
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={deselectAllGuests}
                        disabled={selectedGuestIds.size === 0}
                      >
                        Deseleziona tutti
                      </Button>
                    </div>
                    <Badge variant="secondary">
                      {selectedGuestIds.size} / {filteredGuests.length} selezionati
                    </Badge>
                  </div>
                )}

                {/* Guest List Preview */}
                <div className="mt-4 border rounded-lg max-h-[300px] overflow-y-auto">
                  {filteredGuests.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      {activeFilter === "no_phone" 
                        ? "Ottimo! Tutti gli invitati hanno un numero di telefono."
                        : activeFilter === "to_send"
                        ? "Tutti gli invitati con telefono hanno già ricevuto l'invito!"
                        : "Nessun invito è stato ancora inviato."}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredGuests.map((guest) => (
                        <div 
                          key={guest.id} 
                          className={`p-3 flex items-center gap-3 hover:bg-muted/50 cursor-pointer ${
                            selectedGuestIds.has(guest.id) ? 'bg-primary/5' : ''
                          }`}
                          onClick={() => activeFilter === "to_send" && toggleGuestSelection(guest.id)}
                        >
                          {activeFilter === "to_send" && (
                            <Checkbox 
                              checked={selectedGuestIds.has(guest.id)}
                              onCheckedChange={() => toggleGuestSelection(guest.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <div className="flex-1 flex items-center justify-between">
                            <div>
                              <span className="font-medium">{guest.first_name} {guest.last_name}</span>
                              {guest.rsvp_invitation_sent && (
                                <Badge variant="outline" className="ml-2 text-xs text-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Inviato
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {guest.phone ? (
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {guest.phone}
                                </span>
                              ) : (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  No telefono
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleContinueToTemplate} 
                size="lg" 
                className="w-full"
                disabled={selectedGuestIds.size === 0 || activeFilter === "no_phone" || activeFilter === "already_sent" || !isRsvpConfigured}
              >
                {!isRsvpConfigured
                  ? "⚠️ Configura prima la pagina RSVP"
                  : activeFilter === "already_sent" 
                  ? "Seleziona 'Da Inviare' per continuare"
                  : activeFilter === "no_phone"
                  ? "Aggiungi numeri di telefono per continuare"
                  : selectedGuestIds.size === 0
                  ? "Seleziona almeno un invitato"
                  : `Continua con ${selectedGuestIds.size} invitati`}
              </Button>
            </div>
          )}

          {step === "template" && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    📝 Passo 2: Scrivi il Messaggio
                  </label>
                  <div className="space-y-2">
                    <Textarea
                      value={messageTemplate}
                      onChange={(e) => setMessageTemplate(e.target.value)}
                      rows={8}
                      placeholder="Usa le variabili: [NomeInvitato], [LINK_RSVP], [NomeCoppia]"
                      className="font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateAIMessage}
                        disabled={isGeneratingAI}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {isGeneratingAI ? "Generazione..." : "✨ Genera Testo con AI"}
                      </Button>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Button variant="outline" size="sm" type="button" asChild>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Carica Immagine (Opzionale)
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>

                {uploadedImage && (
                  <div className="relative inline-block">
                    <img src={uploadedImage} alt="Preview" className="max-w-xs rounded border" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setUploadedImage(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* RSVP Link Preview */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Link2 className="w-4 h-4" />
                    <span className="font-medium text-sm">Link RSVP Personalizzato</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ogni invitato riceverà un link unico alla pagina RSVP che hai configurato:
                  </p>
                  <code className="block text-xs bg-background/80 p-2 rounded border font-mono">
                    {rsvpDomain}<span className="text-primary">[token-univoco]</span>
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    ℹ️ La variabile <code className="bg-background px-1 rounded">[LINK_RSVP]</code> nel messaggio verrà sostituita automaticamente con il link corretto per ogni invitato.
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-medium">📋 Variabili disponibili:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li><code>[NomeInvitato]</code> - Nome completo dell'invitato</li>
                    <li><code>[LINK_RSVP]</code> - Link RSVP unico personalizzato</li>
                    <li><code>[NomeCoppia]</code> - Nomi degli sposi</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("filter")}>
                  ← Indietro
                </Button>
                <Button onClick={startSending} size="lg" className="flex-1">
                  Avvia Invii ({selectedGuests.length} messaggi)
                </Button>
              </div>
            </>
          )}

          {step === "sending" && currentGuest && (
            <div className="space-y-6">
              <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    Pronto per l'invio {currentIndex + 1} di {guests.length}
                  </p>
                  <h3 className="text-2xl font-bold">
                    {currentGuest.first_name} {currentGuest.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">📱 {currentGuest.phone}</p>
                </div>

                {!whatsappOpened ? (
                  <Button
                    onClick={prepareWhatsAppMessage}
                    size="lg"
                    className="w-full"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    ➡️ 1. Prepara Messaggio su WhatsApp
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-background border rounded-lg p-4 text-center">
                      <p className="text-sm mb-2">
                        ✅ <strong>Invio per {currentGuest.first_name} pronto!</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vai sulla tab di WhatsApp, premi "Invio" per mandare il messaggio,
                        poi torna qui e conferma.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={markAsSent} className="flex-1" size="lg">
                        ✔ 2. Messaggio Inviato! Carica il prossimo
                      </Button>
                      <Button onClick={skipGuest} variant="outline" size="lg">
                        <SkipForward className="w-4 h-4 mr-2" />
                        Salta
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview del messaggio */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Anteprima messaggio:</p>
                <p className="text-sm whitespace-pre-wrap">
                  {messageTemplate
                    .replace(/\[NomeInvitato\]/g, `${currentGuest.first_name} ${currentGuest.last_name}`)
                    .replace(/\[LINK_RSVP\]/g, `${window.location.origin}/rsvp/${currentGuest.unique_rsvp_token}`)
                    .replace(/\[NomeCoppia\]/g, coupleName)}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
