import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Send, SkipForward, Upload, X, Filter, Phone, AlertCircle, Users, Baby, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  unique_rsvp_token: string | null;
  rsvp_invitation_sent: string | null;
  party_id: string | null;
  is_child: boolean;
}

interface InviteParty {
  id: string;
  party_name: string;
  rsvp_status?: string;
}

interface RSVPCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedParties: InviteParty[];
  weddingId: string;
  coupleName: string;
}

type FilterType = "all" | "pending" | "with_children" | "no_phone";

export function RSVPCampaignDialog({
  open,
  onOpenChange,
  selectedParties,
  weddingId,
  coupleName,
}: RSVPCampaignDialogProps) {
  const [step, setStep] = useState<"filter" | "template" | "sending">("filter");
  const [activeFilter, setActiveFilter] = useState<FilterType>("pending");
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

  useEffect(() => {
    if (open) {
      loadAllData();
    } else {
      setStep("filter");
      setActiveFilter("pending");
    }
  }, [open, weddingId]);

  const loadAllData = async () => {
    // Load all parties if none selected
    if (selectedParties.length === 0) {
      const { data: parties } = await supabase
        .from("invite_parties")
        .select("id, party_name, rsvp_status")
        .eq("wedding_id", weddingId);
      setAllParties(parties || []);
    } else {
      setAllParties(selectedParties);
    }

    // Load all guests for filtering
    const partyIds = selectedParties.length > 0 
      ? selectedParties.map(p => p.id)
      : undefined;

    let query = supabase
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("party_id");

    if (partyIds) {
      query = query.in("party_id", partyIds);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Errore nel caricamento degli invitati");
      console.error(error);
      return;
    }

    setAllGuests(data || []);
  };

  // Filter stats
  const filterStats = useMemo(() => {
    const pending = allGuests.filter(g => 
      g.phone && !g.rsvp_invitation_sent
    );
    const withChildren = allGuests.filter(g => 
      g.phone && !g.rsvp_invitation_sent && g.is_child
    );
    const noPhone = allGuests.filter(g => !g.phone);
    
    return {
      all: allGuests.filter(g => g.phone && !g.rsvp_invitation_sent).length,
      pending: pending.length,
      with_children: withChildren.length,
      no_phone: noPhone.length,
    };
  }, [allGuests]);

  // Apply filter
  const filteredGuests = useMemo(() => {
    let filtered = allGuests.filter(g => g.phone && !g.rsvp_invitation_sent);
    
    switch (activeFilter) {
      case "with_children":
        // Get parties that have children
        const partiesWithChildren = new Set(
          allGuests.filter(g => g.is_child).map(g => g.party_id)
        );
        filtered = filtered.filter(g => partiesWithChildren.has(g.party_id));
        break;
      case "no_phone":
        filtered = allGuests.filter(g => !g.phone);
        break;
      // "all" and "pending" show same (those not sent yet with phone)
    }
    
    return filtered;
  }, [allGuests, activeFilter]);

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

  const startSending = () => {
    setGuests(filteredGuests);
    if (filteredGuests.length === 0) {
      toast.error("Nessun invitato da contattare con il filtro selezionato");
      return;
    }
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
                
                <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)}>
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      In Attesa
                      <Badge variant="secondary" className="ml-1">{filterStats.pending}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="all" className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Tutti
                      <Badge variant="secondary" className="ml-1">{filterStats.all}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="with_children" className="flex items-center gap-2">
                      <Baby className="w-4 h-4" />
                      Con Bambini
                      <Badge variant="secondary" className="ml-1">{filterStats.with_children}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="no_phone" className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Senza Tel.
                      <Badge variant="destructive" className="ml-1">{filterStats.no_phone}</Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Guest List Preview */}
                <div className="mt-4 border rounded-lg max-h-[300px] overflow-y-auto">
                  {filteredGuests.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      {activeFilter === "no_phone" 
                        ? "Questi invitati non hanno un numero di telefono registrato"
                        : "Nessun invitato corrisponde a questo filtro"}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredGuests.slice(0, 20).map((guest) => (
                        <div key={guest.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                          <div>
                            <span className="font-medium">{guest.first_name} {guest.last_name}</span>
                            {guest.is_child && (
                              <Badge variant="outline" className="ml-2 text-xs">Bambino</Badge>
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
                      ))}
                      {filteredGuests.length > 20 && (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          ... e altri {filteredGuests.length - 20} invitati
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={() => setStep("template")} 
                size="lg" 
                className="w-full"
                disabled={filteredGuests.length === 0 || activeFilter === "no_phone"}
              >
                Continua con {filteredGuests.length} invitati
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
                  Avvia Invii ({filteredGuests.length} messaggi)
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
