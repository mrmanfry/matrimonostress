import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  resolveDisplayName,
  resolveSyncToken,
  type PartyPrintTarget,
} from "@/lib/printNameResolver";
import PrintDesignStep, { type FontStyle, FONT_MAP, type WeddingPrintData } from "./PrintDesignStep";
import PrintAudienceStep from "./PrintAudienceStep";
import PrintGenerationStep from "./PrintGenerationStep";
import HiddenPrintNode from "./HiddenPrintNode";

export type EdgeStyle = 'none' | 'watercolor' | 'soft';

export interface ImageTransform {
  x: number;
  y: number;
  scale: number;
}

interface PrintDesignConfig {
  fontStyle: FontStyle;
  edgeStyle: EdgeStyle;
  imageTransform: ImageTransform;
  backgroundImagePath: string | null;
  printed_party_ids?: string[];
}

interface PrintInvitationEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
}

const STEPS = [
  { label: 'Design', number: 1 },
  { label: 'Destinatari', number: 2 },
];

const PrintInvitationEditor = ({ open, onOpenChange, weddingId }: PrintInvitationEditorProps) => {
  const { toast } = useToast();

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [fontStyle, setFontStyle] = useState<FontStyle>('garamond');
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [imageTransform, setImageTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1 });
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>('none');

  // Persistence tracking
  const [bgDirty, setBgDirty] = useState(false);
  const [savedBgPath, setSavedBgPath] = useState<string | null>(null);
  const [designLoaded, setDesignLoaded] = useState(false);
  const [printedPartyIds, setPrintedPartyIds] = useState<string[]>([]);

  // Wedding data
  const [weddingData, setWeddingData] = useState<WeddingPrintData>({
    partner1Name: '',
    partner2Name: '',
    weddingDate: '',
    ceremonyTime: null,
    ceremonyVenueName: null,
    ceremonyVenueAddress: null,
    receptionVenueName: null,
    receptionVenueAddress: null,
    receptionTime: null,
  });

  // Step 2 state
  const [parties, setParties] = useState<PartyPrintTarget[]>([]);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);

  // Step 3 state
  const [progress, setProgress] = useState(0);
  const [currentProcessingParty, setCurrentProcessingParty] = useState<PartyPrintTarget | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const bgDataUrlRef = useRef<string | null>(null);

  // Fetch wedding data + saved design on open
  useEffect(() => {
    if (open && weddingId) {
      fetchWeddingData();
    }
  }, [open, weddingId]);

  const fetchWeddingData = async () => {
    const { data } = await supabase
      .from('weddings')
      .select('partner1_name, partner2_name, wedding_date, ceremony_start_time, ceremony_venue_name, ceremony_venue_address, reception_venue_name, reception_venue_address, reception_start_time, print_design')
      .eq('id', weddingId)
      .single();

    if (data) {
      setWeddingData({
        partner1Name: data.partner1_name,
        partner2Name: data.partner2_name,
        weddingDate: data.wedding_date,
        ceremonyTime: data.ceremony_start_time,
        ceremonyVenueName: data.ceremony_venue_name,
        ceremonyVenueAddress: data.ceremony_venue_address,
        receptionVenueName: data.reception_venue_name,
        receptionVenueAddress: data.reception_venue_address,
        receptionTime: data.reception_start_time,
      });

      // Restore saved design if available and not already loaded
      if (data.print_design && !designLoaded) {
        const config = data.print_design as unknown as PrintDesignConfig;
        if (config.fontStyle) setFontStyle(config.fontStyle);
        if (config.edgeStyle) setEdgeStyle(config.edgeStyle);
        if (config.imageTransform) setImageTransform(config.imageTransform);
        if (config.printed_party_ids) setPrintedPartyIds(config.printed_party_ids);
        if (config.backgroundImagePath) {
          setSavedBgPath(config.backgroundImagePath);
          loadBackgroundFromStorage(config.backgroundImagePath);
        }
        setDesignLoaded(true);
      }
    }
  };

  const loadBackgroundFromStorage = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('print-assets')
        .download(path);
      if (error || !data) return;
      const url = URL.createObjectURL(data);
      setBackgroundImage(url);
      setBgDirty(false);
    } catch (err) {
      console.error('Error loading print background:', err);
    }
  };

  // Track when user changes the background image
  const handleBackgroundChange = useCallback((url: string | null) => {
    setBackgroundImage(url);
    setBgDirty(true);
  }, []);

  // Save design to DB + upload photo if dirty
  const saveDesign = useCallback(async () => {
    let bgPath = savedBgPath;

    // Upload new background if changed
    if (bgDirty && backgroundImage) {
      try {
        // Delete old file if exists
        if (savedBgPath) {
          await supabase.storage.from('print-assets').remove([savedBgPath]);
        }

        const response = await fetch(backgroundImage);
        const blob = await response.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        const newPath = `${weddingId}/print_bg_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('print-assets')
          .upload(newPath, blob, { contentType: blob.type, upsert: true });

        if (!uploadError) {
          bgPath = newPath;
          setSavedBgPath(newPath);
        }
      } catch (err) {
        console.error('Error uploading print background:', err);
      }
    } else if (bgDirty && !backgroundImage) {
      // User removed the background
      if (savedBgPath) {
        await supabase.storage.from('print-assets').remove([savedBgPath]);
      }
      bgPath = null;
      setSavedBgPath(null);
    }

    const config: PrintDesignConfig = {
      fontStyle,
      edgeStyle,
      imageTransform,
      backgroundImagePath: bgPath,
    };

    await supabase
      .from('weddings')
      .update({ print_design: config as any })
      .eq('id', weddingId);

    setBgDirty(false);
  }, [backgroundImage, bgDirty, savedBgPath, fontStyle, edgeStyle, imageTransform, weddingId]);

  // Load parties when entering step 2
  useEffect(() => {
    if (step === 2 && weddingId) {
      loadParties();
      // Save design when advancing to step 2
      saveDesign();
    }
  }, [step, weddingId]);

  const loadParties = async () => {
    setLoadingParties(true);
    try {
      const { data: partiesData } = await supabase
        .from('invite_parties')
        .select('id, party_name, rsvp_status, wedding_id')
        .eq('wedding_id', weddingId);

      const { data: guestsData } = await supabase
        .from('guests')
        .select('id, first_name, last_name, is_child, unique_rsvp_token, phone, party_id, is_couple_member, is_staff')
        .eq('wedding_id', weddingId);

      if (!partiesData || !guestsData) return;

      const realGuests = guestsData.filter(g => !g.is_couple_member && !g.is_staff);
      const partyTargets: PartyPrintTarget[] = [];

      const rsvpMap: Record<string, PartyPrintTarget['rsvpStatus']> = {
        'Confermato': 'confirmed',
        'Rifiutato': 'declined',
      };

      for (const party of partiesData) {
        const members = realGuests.filter(g => g.party_id === party.id);
        if (members.length === 0) continue;

        partyTargets.push({
          partyId: party.id,
          displayName: resolveDisplayName({
            id: party.id,
            party_name: party.party_name,
            guests: members,
          }),
          guestCount: members.length,
          syncToken: resolveSyncToken(members),
          rsvpStatus: rsvpMap[party.rsvp_status] || 'pending',
        });
      }

      const soloGuests = realGuests.filter(g => !g.party_id);
      for (const guest of soloGuests) {
        partyTargets.push({
          partyId: `solo_${guest.id}`,
          displayName: `${guest.first_name} ${guest.last_name}`.trim(),
          guestCount: 1,
          syncToken: guest.unique_rsvp_token || '',
          rsvpStatus: 'pending',
        });
      }

      setParties(partyTargets);
    } catch (err) {
      console.error('Error loading parties:', err);
    } finally {
      setLoadingParties(false);
    }
  };

  // Convert blob URL to data URL for html2canvas
  useEffect(() => {
    if (backgroundImage && backgroundImage.startsWith('blob:')) {
      fetch(backgroundImage)
        .then(r => r.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            bgDataUrlRef.current = reader.result as string;
          };
          reader.readAsDataURL(blob);
        });
    } else {
      bgDataUrlRef.current = backgroundImage;
    }
  }, [backgroundImage]);

  // PDF Generation
  const generatePDF = useCallback(async () => {
    const selectedParties = parties.filter(p => selectedPartyIds.includes(p.partyId));
    if (selectedParties.length === 0) return;

    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

      for (let i = 0; i < selectedParties.length; i++) {
        const party = selectedParties[i];

        setCurrentProcessingParty(party);
        setCurrentIndex(i + 1);
        setProgress(((i) / selectedParties.length) * 100);

        await new Promise(resolve => setTimeout(resolve, 200));

        const printNode = document.getElementById('hidden-print-node');
        if (!printNode) continue;

        const canvas = await html2canvas(printNode, {
          scale: 1,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 148, 210);
      }

      setProgress(100);
      pdf.save('Inviti_Cartacei_Nozze.pdf');

      // Save printed party IDs to print_design
      const newPrintedIds = [...new Set([...printedPartyIds, ...selectedPartyIds])];
      setPrintedPartyIds(newPrintedIds);
      const { data: wData } = await supabase
        .from('weddings')
        .select('print_design')
        .eq('id', weddingId)
        .single();
      const existingConfig = (wData?.print_design as unknown as PrintDesignConfig) || {};
      await supabase
        .from('weddings')
        .update({ print_design: { ...existingConfig, printed_party_ids: newPrintedIds } as any })
        .eq('id', weddingId);

      await new Promise(resolve => setTimeout(resolve, 500));
      setIsSuccess(true);
    } catch (error) {
      console.error('Errore PDF:', error);
      toast({
        title: 'Errore di generazione',
        description: 'Non è stato possibile creare il PDF. Riprova con meno invitati.',
        variant: 'destructive',
      });
      setStep(2);
    }
  }, [parties, selectedPartyIds, toast]);

  useEffect(() => {
    if (step === 3) {
      generatePDF();
    }
  }, [step]);

  const handleClose = () => {
    if (step === 3 && !isSuccess) return;
    // Reset only wizard-session state, NOT design settings
    setStep(1);
    setProgress(0);
    setCurrentProcessingParty(null);
    setCurrentIndex(0);
    setIsSuccess(false);
    setSelectedPartyIds([]);
    // Save design on close so settings are persisted
    saveDesign();
    onOpenChange(false);
  };

  const fontFamily = FONT_MAP[fontStyle];

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent
          className="max-w-[95vw] w-full h-[90vh] p-0 flex flex-col gap-0 [&>button]:hidden"
          onInteractOutside={(e) => {
            if (step === 3 && !isSuccess) e.preventDefault();
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-foreground">Progetta il tuo Invito</h2>
              {step < 3 && (
                <div className="hidden md:flex items-center gap-2 text-sm">
                  {STEPS.map((s, idx) => (
                    <div key={s.number} className="flex items-center gap-1.5">
                      {idx > 0 && <span className="text-muted-foreground">→</span>}
                      <span
                        className={
                          step === s.number
                            ? 'text-primary font-semibold'
                            : step > s.number
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }
                      >
                        {s.number}. {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} disabled={step === 3 && !isSuccess}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {step === 1 && (
              <PrintDesignStep
                backgroundImage={backgroundImage}
                onBackgroundChange={handleBackgroundChange}
                fontStyle={fontStyle}
                onFontStyleChange={setFontStyle}
                showSafeZone={showSafeZone}
                onShowSafeZoneChange={setShowSafeZone}
                weddingData={weddingData}
                imageTransform={imageTransform}
                onImageTransformChange={setImageTransform}
                edgeStyle={edgeStyle}
                onEdgeStyleChange={setEdgeStyle}
              />
            )}

            {step === 2 && (
              loadingParties ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <PrintAudienceStep
                  parties={parties}
                  selectedPartyIds={selectedPartyIds}
                  onSelectionChange={setSelectedPartyIds}
                  printedPartyIds={printedPartyIds}
                />
              )
            )}

            {step === 3 && (
              <PrintGenerationStep
                progress={progress}
                currentName={currentProcessingParty?.displayName || ''}
                currentIndex={currentIndex}
                total={parties.filter(p => selectedPartyIds.includes(p.partyId)).length}
                isSuccess={isSuccess}
                onClose={handleClose}
              />
            )}
          </div>

          {/* Footer navigation */}
          {step < 3 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div>
                {step === 2 && (
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Indietro
                  </Button>
                )}
              </div>
              <div>
                {step === 1 && (
                  <Button onClick={() => setStep(2)}>
                    Avanti
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {step === 2 && (
                  <Button
                    onClick={() => setStep(3)}
                    disabled={selectedPartyIds.length === 0}
                  >
                    Conferma e Genera ({selectedPartyIds.length})
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden render node for PDF generation */}
      {step === 3 && currentProcessingParty && (
        <HiddenPrintNode
          displayName={currentProcessingParty.displayName}
          syncToken={currentProcessingParty.syncToken}
          fontFamily={fontFamily}
          backgroundImageUrl={bgDataUrlRef.current}
          weddingData={weddingData}
          imageTransform={imageTransform}
          edgeStyle={edgeStyle}
        />
      )}
    </>
  );
};

export default PrintInvitationEditor;
