import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Send, SkipForward, Upload, X, Filter, Phone, AlertCircle, Users, CheckCircle, PhoneOff, Settings, Link2, RotateCcw, RefreshCw, Info, ImageIcon, Share2, Copy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { CampaignTypePicker, type CampaignType } from "./CampaignTypePicker";
import { CampaignsConfig } from "@/components/settings/CampaignCard";

// Utility: Converte Data URL (base64) in File object per Share API
const dataURLToFile = async (dataUrl: string, filename: string): Promise<File> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
};

// Utility: Verifica se il browser supporta la condivisione di file
const canShareFiles = async (file: File): Promise<boolean> => {
  return navigator.share !== undefined && 
         navigator.canShare !== undefined && 
         navigator.canShare({ files: [file] });
};

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  alias?: string;
  phone: string | null;
  unique_rsvp_token: string | null;
  rsvp_invitation_sent: string | null;
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  last_reminder_sent_at?: string | null;
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
  preSelectedGuestIds?: Set<string>;
  onDataChange?: () => void; // Callback per sincronizzare i dati con il padre
}

type FilterType = "to_send" | "already_sent" | "no_phone";

// Storage key for campaign persistence
const STORAGE_KEY = "rsvp_campaign_progress";

// Interface for saved campaign state
interface SavedCampaignState {
  weddingId: string;
  guests: Guest[];
  currentIndex: number;
  messageTemplate: string;
  whatsappOpened: boolean;
  campaignType: CampaignType;
  timestamp: number;
  uploadedImage: string | null;
}

// Message templates per campaign type (defaults)
const DEFAULT_MESSAGE_TEMPLATES: Record<CampaignType, string> = {
  save_the_date: `Ciao [NomeInvitato], con molta gioia, desideriamo condividere con te un momento speciale: il nostro matrimonio. ❤️

[NomeCoppia] si sposano e sarebbe un vero regalo averti con noi per festeggiare questo inizio.

Puoi trovare tutti i dettagli e confermare la tua presenza qui:
[LINK_RSVP]

Non vediamo l'ora di riabbracciarti!
[NomeCoppia]`,
  formal_invite: `Ciao [NomeInvitato], con molta gioia, desideriamo condividere con te un momento speciale: il nostro matrimonio. ❤️

[NomeCoppia] si sposano e sarebbe un vero regalo averti con noi per festeggiare questo inizio.

Puoi trovare tutti i dettagli e confermare la tua presenza qui:
[LINK_RSVP]

Non vediamo l'ora di riabbracciarti!
[NomeCoppia]`,
  reminder: `Ciao [NomeInvitato]! 👋

Ti ricordiamo di confermare la tua presenza al matrimonio di [NomeCoppia].

Puoi farlo cliccando qui:
[LINK_RSVP]

Grazie! ❤️`,
};

export function RSVPCampaignDialog({
  open,
  onOpenChange,
  selectedParties,
  weddingId,
  coupleName,
  preSelectedGuestIds,
  onDataChange,
}: RSVPCampaignDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"campaign_type" | "filter" | "template" | "sending">("campaign_type");
  const [campaignType, setCampaignType] = useState<CampaignType | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("to_send");
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_MESSAGE_TEMPLATES.formal_invite);
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
  const [campaignsConfig, setCampaignsConfig] = useState<CampaignsConfig | null>(null);
  
  // Recovery state - tracks if we're recovering from a page refresh
  const [isRecoveringFromRefresh, setIsRecoveringFromRefresh] = useState(false);

  // Recovery from localStorage on mount
  useEffect(() => {
    if (open) {
      loadAllData();
      
      // Check for saved campaign progress
      const savedProgress = localStorage.getItem(STORAGE_KEY);
      if (savedProgress) {
        try {
          const parsed: SavedCampaignState = JSON.parse(savedProgress);
          // Only restore if it's recent (within 24 hours) and same wedding
          const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
          if (isRecent && parsed.weddingId === weddingId) {
            toast.info("🔄 Ripristino campagna RSVP in corso...");
            
            // Restore full state
            setGuests(parsed.guests);
            setCurrentIndex(parsed.currentIndex);
            setMessageTemplate(parsed.messageTemplate);
            setCampaignType(parsed.campaignType || 'formal_invite');
            setStep("sending");
            
            // Restore uploaded image if present
            if (parsed.uploadedImage) {
              setUploadedImage(parsed.uploadedImage);
            }
            
            // If whatsappOpened was true, we're in "Limbo State"
            if (parsed.whatsappOpened) {
              setIsRecoveringFromRefresh(true);
              setWhatsappOpened(true);
            }
          }
        } catch (e) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } else {
      // Full reset when dialog closes (prevents stale state)
      setStep("campaign_type");
      setCampaignType(null);
      setActiveFilter("to_send");
      setSelectedPartyId(null);
      setSelectedGroupId(null);
      setSelectedGuestIds(new Set());
      setIsRecoveringFromRefresh(false);
      setGuests([]);
      setCurrentIndex(0);
      setWhatsappOpened(false);
    }
  }, [open, weddingId]);

  // Auto-save campaign state whenever critical state changes during "sending" step
  // GUARD: Only save if dialog is open AND we have valid campaign data
  useEffect(() => {
    if (open && step === "sending" && guests.length > 0 && weddingId && campaignType) {
      try {
        const stateToSave: SavedCampaignState = {
          weddingId,
          guests,
          currentIndex,
          messageTemplate,
          whatsappOpened,
          campaignType,
          timestamp: Date.now(),
          uploadedImage,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (e) {
        // Handle localStorage quota exceeded (large images)
        console.warn("Could not save campaign state:", e);
      }
    }
  }, [open, step, guests, currentIndex, messageTemplate, whatsappOpened, weddingId, campaignType, uploadedImage]);

  // Apply pre-selection when allGuests loads and we have preSelectedGuestIds
  useEffect(() => {
    if (open && preSelectedGuestIds && preSelectedGuestIds.size > 0 && allGuests.length > 0) {
      // Filter to only include guests that exist and have a phone
      const validIds = new Set(
        allGuests
          .filter(g => preSelectedGuestIds.has(g.id) && g.phone && g.phone.trim() !== '')
          .map(g => g.id)
      );
      if (validIds.size > 0) {
        setSelectedGuestIds(validIds);
      }
    }
  }, [open, preSelectedGuestIds, allGuests]);

  // Reset selection when filters change (but NOT if we have preselection)
  useEffect(() => {
    // Only reset if no preselection was provided
    if (!preSelectedGuestIds || preSelectedGuestIds.size === 0) {
      setSelectedGuestIds(new Set());
    }
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

    // Load RSVP config and campaigns_config from wedding
    const { data: wedding } = await supabase
      .from("weddings")
      .select("rsvp_config, campaigns_config")
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

    // Load campaigns_config for saved message templates
    if (wedding?.campaigns_config) {
      setCampaignsConfig(wedding.campaigns_config as unknown as CampaignsConfig);
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

  // Helper: determina se un guest è stato già contattato per questo tipo di campagna
  const hasBeenSentForCampaign = (g: Guest) => {
    switch (campaignType) {
      case 'save_the_date':
        return !!g.save_the_date_sent_at;
      case 'reminder':
        return !!g.last_reminder_sent_at;
      case 'formal_invite':
      default:
        // formal_invite_sent_at è la Single Source of Truth
        return !!g.formal_invite_sent_at;
    }
  };

  // Filter stats based on pre-filtered guests
  const filterStats = useMemo(() => {
    const withPhone = preFilteredGuests.filter(g => g.phone && g.phone.trim() !== "");
    const toSend = withPhone.filter(g => !hasBeenSentForCampaign(g));
    const alreadySent = withPhone.filter(g => hasBeenSentForCampaign(g));
    const noPhone = preFilteredGuests.filter(g => !g.phone || g.phone.trim() === "");
    
    return {
      to_send: toSend.length,
      already_sent: alreadySent.length,
      no_phone: noPhone.length,
      total_with_phone: withPhone.length,
    };
  }, [preFilteredGuests, campaignType]);

  // Apply status filter on top of party/group filters
  const filteredGuests = useMemo(() => {
    switch (activeFilter) {
      case "to_send":
        return preFilteredGuests.filter(g => 
          g.phone && g.phone.trim() !== "" && !hasBeenSentForCampaign(g)
        );
      case "already_sent":
        return preFilteredGuests.filter(g => 
          g.phone && g.phone.trim() !== "" && hasBeenSentForCampaign(g)
        );
      case "no_phone":
        return preFilteredGuests.filter(g => !g.phone || g.phone.trim() === "");
      default:
        return [];
    }
  }, [preFilteredGuests, activeFilter, campaignType]);

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

  const startSending = async () => {
    if (selectedGuests.length === 0) {
      toast.error("Nessun invitato selezionato");
      return;
    }

    // Save the message template to campaigns_config if it was modified
    if (campaignType) {
      const campaignKey = campaignType === 'save_the_date' ? 'save_the_date' : 'rsvp';
      const updatedConfig: CampaignsConfig = campaignsConfig 
        ? { ...campaignsConfig }
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
              show_countdown: false,
              show_powered_by: true,
            },
          };

      updatedConfig[campaignKey] = {
        ...updatedConfig[campaignKey],
        whatsapp_message_template: messageTemplate,
      };

      // Save to database
      await supabase
        .from("weddings")
        .update({ campaigns_config: updatedConfig as any })
        .eq("id", weddingId);

      setCampaignsConfig(updatedConfig);
    }

    setGuests(selectedGuests);
    setStep("sending");
    setCurrentIndex(0);
    setWhatsappOpened(false);
    setIsRecoveringFromRefresh(false);
  };

  /**
   * Canvas Cleaning: Pulisce l'immagine da qualsiasi metadato di file system
   * ridisegnandola su un canvas e copiando il risultato puro nella clipboard.
   * Questo risolve il problema del "doppio allegato" su WhatsApp Web/Edge.
   */
  const copyImageToClipboard = async (base64Image: string): Promise<boolean> => {
    try {
      // 1. Creiamo un elemento immagine in memoria
      const img = new Image();
      img.src = base64Image;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // 2. Creiamo un Canvas invisibile delle stesse dimensioni
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error("Canvas context failed");

      // 3. Disegniamo l'immagine (questo rimuove ogni legame col file originale)
      ctx.drawImage(img, 0, 0);

      // 4. Estraiamo il BLOB puro (PNG è il più sicuro per la clipboard)
      const blob = await new Promise<Blob | null>(resolve => 
        canvas.toBlob(resolve, 'image/png')
      );

      if (!blob) throw new Error("Blob creation failed");

      // 5. Scriviamo nella clipboard SOLO l'immagine PNG pulita
      const item = new ClipboardItem({
        'image/png': blob
      });

      await navigator.clipboard.write([item]);
      
      toast.success("📸 Immagine Copiata!", {
        description: "Ora vai su WhatsApp e premi Incolla (Ctrl+V / Cmd+V).",
        duration: 6000,
      });
      
      return true;

    } catch (err) {
      console.error("Errore copia canvas:", err);
      toast.error("Impossibile copiare l'immagine automaticamente", {
        description: "Allega l'immagine manualmente dal tuo dispositivo.",
      });
      return false;
    }
  };

  /**
   * SINGLE SOURCE OF TRUTH: Builds WhatsApp message payload for a guest.
   * Used by ALL message generation points (send, reopen, preview).
   */
  const buildWhatsAppPayload = (guest: Guest) => {
    // Smart alias logic: use alias if available, otherwise use first name only
    const displayName = guest.alias?.trim() 
      ? guest.alias 
      : guest.first_name;
    
    // Dynamic link based on campaign type
    const link = campaignType === 'save_the_date'
      ? `${window.location.origin}/save-the-date/${guest.unique_rsvp_token}`
      : `${window.location.origin}/rsvp/${guest.unique_rsvp_token}`;

    const message = messageTemplate
      .replace(/\[NomeInvitato\]/g, displayName)
      .replace(/\[LINK_RSVP\]/g, link)
      .replace(/\[NomeCoppia\]/g, coupleName);

    const phoneNumber = guest.phone?.replace(/[^0-9]/g, "") || "";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    return { displayName, link, message, phoneNumber, whatsappUrl };
  };

  const handleSmartSend = async () => {
    const currentGuest = guests[currentIndex];
    if (!currentGuest) return;

    const { message, whatsappUrl } = buildWhatsAppPayload(currentGuest);

    // 1. CASO MOBILE NATIVO CON IMMAGINE (Migliore esperienza)
    if (uploadedImage && navigator.share && navigator.canShare) {
      try {
        const file = await dataURLToFile(uploadedImage, 'invito-matrimonio.jpg');
        
        if (await canShareFiles(file)) {
          await navigator.share({
            files: [file],
            text: message,
            title: 'Invito Matrimonio'
          });
          
          // Se arriviamo qui, l'utente ha condiviso con successo (o almeno ha aperto il foglio)
          setWhatsappOpened(true);
          setIsRecoveringFromRefresh(false);
          return; 
        }
      } catch (error) {
        // L'utente ha annullato o Share API fallita, prosegui con fallback Desktop
        console.log('Share API fallita o annullata, fallback su metodo Desktop', error);
      }
    }

    // 2. CASO DESKTOP (Metodo Clipboard + WhatsApp Web)
    // PRIMA: Aprire WhatsApp Web (sincrono rispetto al click per evitare blocco popup)
    window.open(whatsappUrl, "_blank");
    
    // POI: Se c'è immagine, copiarla con Canvas Cleaning (rimuove metadati Edge)
    if (uploadedImage) {
      await copyImageToClipboard(uploadedImage);
      // Breve pausa tecnica per assicurare che il SO recepisca
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // INFINE: Aggiornare lo stato UI
    setWhatsappOpened(true);
    setIsRecoveringFromRefresh(false);
  };

  const markAsSent = async () => {
    const currentGuest = guests[currentIndex];
    if (!currentGuest) return;

    const now = new Date().toISOString();
    
    // Build update payload based on campaign type
    // NOTE: rsvp_invitation_sent è DEPRECATO - usiamo solo i campi specifici
    const updatePayload: Record<string, string> = {};
    
    if (campaignType === 'save_the_date') {
      updatePayload.save_the_date_sent_at = now;
    } else if (campaignType === 'reminder') {
      updatePayload.last_reminder_sent_at = now;
    } else {
      // formal_invite è la Single Source of Truth per "invito inviato"
      updatePayload.formal_invite_sent_at = now;
    }

    const { error } = await supabase
      .from("guests")
      .update(updatePayload)
      .eq("id", currentGuest.id);

    if (error) {
      toast.error("Errore nell'aggiornamento dello stato");
      console.error(error);
      return;
    }

    // Update local state to reflect the change in counters
    setAllGuests(prev => prev.map(g => 
      g.id === currentGuest.id 
        ? { ...g, ...updatePayload }
        : g
    ));

    // Also update guests array for campaign
    setGuests(prev => prev.map(g => 
      g.id === currentGuest.id 
        ? { ...g, ...updatePayload }
        : g
    ));

    // Notify parent to refresh data (sync KPIs)
    if (onDataChange) {
      onDataChange();
    }

    moveToNext();
  };

  const skipGuest = () => {
    moveToNext();
  };

  const moveToNext = () => {
    setIsRecoveringFromRefresh(false);
    
    if (currentIndex < guests.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setWhatsappOpened(false);
    } else {
      // Campaign complete
      finishCampaign();
    }
  };

  const finishCampaign = () => {
    toast.success("Campagna completata! 🎉");
    localStorage.removeItem(STORAGE_KEY);
    onOpenChange(false);
    setStep("filter");
    setGuests([]);
    setCurrentIndex(0);
    setIsRecoveringFromRefresh(false);
  };

  // Helper to fully reset campaign state (prevents auto-save from rewriting localStorage)
  const resetCampaignState = () => {
    // Clear localStorage FIRST
    localStorage.removeItem(STORAGE_KEY);
    
    // Reset ALL React states that auto-save depends on
    setStep("campaign_type");
    setGuests([]);
    setCurrentIndex(0);
    setWhatsappOpened(false);
    setIsRecoveringFromRefresh(false);
    setCampaignType(null);
    setSelectedGuestIds(new Set());
  };

  // Handle close with confirmation during active campaign
  // Abort campaign cleanly without marking current guest as sent
  const handleAbortCampaign = () => {
    // 1. Fully reset state (prevents auto-save loop)
    resetCampaignState();
    
    // 2. Notify user
    toast.info("Campagna interrotta. I progressi precedenti sono stati salvati.");
    
    // 3. Close dialog
    onOpenChange(false);
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen && step === "sending" && guests.length > 0) {
      const confirmed = window.confirm(
        "Campagna in corso.\n\n" +
        "Se esci ora, l'invitato corrente NON verrà segnato come 'inviato'.\n" +
        "I progressi precedenti rimangono salvati.\n\n" +
        "Vuoi interrompere?"
      );
      if (!confirmed) return;
      
      // Fully reset state to prevent recovery loop
      resetCampaignState();
    }
    onOpenChange(newOpen);
  };

  const currentGuest = guests[currentIndex];
  const progress = guests.length > 0 ? ((currentIndex / guests.length) * 100) : 0;
  const rsvpDomain = `${window.location.origin}/rsvp/`;

  // Recovery UI for "Limbo State" - when page refreshed while WhatsApp was open
  const renderRecoveryUI = () => {
    if (!isRecoveringFromRefresh || !currentGuest) return null;
    
    // Handle skip during recovery - don't mark as sent, just move to next
    const handleSkipDuringRecovery = () => {
      setIsRecoveringFromRefresh(false);
      setWhatsappOpened(false);
      skipGuest();
    };
    
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-6 space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 mb-3">
            <RefreshCw className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
            Sessione Ripristinata
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
            La pagina si è ricaricata mentre stavi inviando a <strong>{currentGuest.first_name} {currentGuest.last_name}</strong>.
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            Hai inviato il messaggio su WhatsApp?
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          {/* Option 1: Yes, sent - continue */}
          <Button 
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => {
              setIsRecoveringFromRefresh(false);
              markAsSent();
            }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Sì, ho inviato → Prosegui
          </Button>
          
          {/* Option 2: No, reopen WhatsApp - ricopia immagine e riapre */}
          <Button 
            variant="outline" 
            className="w-full border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
            onClick={async () => {
              setIsRecoveringFromRefresh(false);
              setWhatsappOpened(false);
              await handleSmartSend();
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {uploadedImage ? "📸 Ricopia Immagine & Riapri WhatsApp" : "🔗 Riapri WhatsApp"}
          </Button>
          {uploadedImage && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center -mt-1">
              L'immagine verrà ricopiata negli appunti
            </p>
          )}
          
          {/* Option 3: Skip this guest */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleSkipDuringRecovery}
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Salta questo invitato
          </Button>
          
          {/* Option 4: Abort campaign entirely */}
          <Button 
            variant="ghost" 
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleAbortCampaign}
          >
            <X className="w-4 h-4 mr-2" />
            Non ho inviato, interrompi campagna
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">💬 Assistente Invio RSVP</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Progress */}
          {step === "sending" && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{currentIndex} / {guests.length} messaggi preparati</span>
                <div className="flex items-center gap-3">
                  <span>{Math.round(progress)}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleAbortCampaign}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Interrompi
                  </Button>
                </div>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Campaign Type Selection - Step 0 */}
          {step === "campaign_type" && (
            <div className="space-y-6">
              <CampaignTypePicker 
                selected={campaignType} 
                onSelect={(type) => {
                  setCampaignType(type);
                  // Use saved template if available, otherwise use default
                  const campaignKey = type === 'save_the_date' ? 'save_the_date' : 'rsvp';
                  const savedTemplate = campaignsConfig?.[campaignKey]?.whatsapp_message_template;
                  setMessageTemplate(savedTemplate || DEFAULT_MESSAGE_TEMPLATES[type]);
                }}
              />
              <Button 
                onClick={() => setStep("filter")} 
                size="lg" 
                className="w-full"
                disabled={!campaignType}
              >
                {campaignType ? "Continua →" : "Seleziona un tipo di campagna"}
              </Button>
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
                              {hasBeenSentForCampaign(guest) && (
                                <Badge variant="outline" className="ml-2 text-xs text-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {campaignType === 'save_the_date' ? 'STD Inviato' : 
                                   campaignType === 'reminder' ? 'Reminder Inviato' : 'Invito Inviato'}
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
              <Button variant="outline" onClick={() => setStep("campaign_type")} className="w-full">
                ← Cambia tipo campagna
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
                  <div className="space-y-3">
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
                    
                    {/* Box Educativo: Come inviare l'immagine */}
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800 font-semibold">
                        📸 Come inviare l'immagine
                      </AlertTitle>
                      <AlertDescription className="text-blue-700 text-sm mt-1">
                        <p className="mb-2">WhatsApp Web non permette l'allegato automatico.</p>
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Il sistema <strong>copierà l'immagine</strong> nei tuoi appunti.</li>
                          <li>Quando si apre la chat, premi <strong>Incolla (Ctrl+V / Cmd+V)</strong>.</li>
                          <li>Il testo del messaggio sarà già pronto.</li>
                        </ol>
                        <p className="mt-2 text-xs text-blue-600">
                          💡 Su smartphone, l'immagine verrà condivisa direttamente con WhatsApp!
                        </p>
                      </AlertDescription>
                    </Alert>
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
              {/* Recovery UI for Limbo State */}
              {isRecoveringFromRefresh ? (
                renderRecoveryUI()
              ) : (
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
                      onClick={handleSmartSend}
                      size="lg"
                      className="w-full"
                    >
                      {uploadedImage ? (
                        <>
                          <Copy className="w-5 h-5 mr-2" />
                          📸 Copia Immagine & Apri WhatsApp
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          ➡️ 1. Prepara Messaggio su WhatsApp
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-background border rounded-lg p-4">
                        <p className="text-sm mb-2 text-center">
                          ✅ <strong>Invio per {currentGuest.first_name} pronto!</strong>
                        </p>
                        {uploadedImage ? (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground text-center">
                              WhatsApp Web si è aperto in un'altra tab. Segui questi passi:
                            </p>
                            <ol className="text-xs text-muted-foreground list-decimal pl-5 space-y-1">
                              <li>Vai sulla tab di WhatsApp Web</li>
                              <li>Premi <strong>Ctrl+V</strong> (o Cmd+V su Mac) per incollare l'immagine</li>
                              <li>Premi Invio per inviare</li>
                            </ol>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                              Non si è aperto?{" "}
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="h-auto p-0 text-xs"
                                onClick={() => {
                                  const { whatsappUrl } = buildWhatsAppPayload(currentGuest);
                                  window.open(whatsappUrl, "_blank");
                                }}
                              >
                                🔗 Riapri WhatsApp
                              </Button>
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center">
                            Vai sulla tab di WhatsApp, premi "Invio" per mandare il messaggio, poi torna qui e conferma.
                          </p>
                        )}
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
              )}

              {/* Preview del messaggio */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Anteprima messaggio:</p>
                <p className="text-sm whitespace-pre-wrap">
                  {buildWhatsAppPayload(currentGuest).message}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
