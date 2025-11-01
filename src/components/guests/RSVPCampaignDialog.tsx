import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Send, SkipForward, Upload, X } from "lucide-react";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  unique_rsvp_token: string | null;
  rsvp_invitation_sent: string | null;
  party_id: string | null;
}

interface InviteParty {
  id: string;
  party_name: string;
}

interface RSVPCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedParties: InviteParty[];
  weddingId: string;
  coupleName: string;
}

export function RSVPCampaignDialog({
  open,
  onOpenChange,
  selectedParties,
  weddingId,
  coupleName,
}: RSVPCampaignDialogProps) {
  const [step, setStep] = useState<"template" | "sending">("template");
  const [messageTemplate, setMessageTemplate] = useState(
    `Ciao [NomeInvitato]! 👋\n\nSiamo felici di invitarti al matrimonio di [NomeCoppia]! 💍\n\nConferma la tua presenza tramite questo link:\n[LINK_RSVP]\n\nGrazie! ❤️`
  );
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [whatsappOpened, setWhatsappOpened] = useState(false);

  useEffect(() => {
    if (open) {
      loadGuestsForCampaign();
    }
  }, [open, selectedParties]);

  const loadGuestsForCampaign = async () => {
    if (selectedParties.length === 0) return;

    const partyIds = selectedParties.map((p) => p.id);

    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .in("party_id", partyIds)
      .not("phone", "is", null)
      .is("rsvp_invitation_sent", null)
      .order("party_id");

    if (error) {
      toast.error("Errore nel caricamento degli invitati");
      console.error(error);
      return;
    }

    setGuests(data || []);
    setCurrentIndex(0);
  };

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
    if (guests.length === 0) {
      toast.error("Nessun invitato da contattare");
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
    const currentGuest = guests[currentIndex];
    if (!currentGuest) return;

    // Mark as sent but with a special note (we could add a field for this)
    const { error } = await supabase
      .from("guests")
      .update({ rsvp_invitation_sent: new Date().toISOString() })
      .eq("id", currentGuest.id);

    if (error) {
      console.error(error);
    }

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
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{currentIndex} / {guests.length} messaggi preparati</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          {step === "template" && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    📝 Passo 1: Scrivi il Messaggio (Una Sola Volta)
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

              <div>
                <label className="text-sm font-medium mb-2 block">
                  🚀 Passo 2: Avvia la Coda di Invio
                </label>
                <Button onClick={startSending} size="lg" className="w-full">
                  Avvia Invii ({guests.length} messaggi)
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
