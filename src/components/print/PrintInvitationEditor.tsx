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
import PrintDesignStep, { type FontStyle, FONT_MAP } from "./PrintDesignStep";
import PrintAudienceStep from "./PrintAudienceStep";
import PrintGenerationStep from "./PrintGenerationStep";
import HiddenPrintNode from "./HiddenPrintNode";

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
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [welcomeText, setWelcomeText] = useState('Siamo felici di invitarvi\nal nostro matrimonio');
  const [fontStyle, setFontStyle] = useState<FontStyle>('serif');
  const [showSafeZone, setShowSafeZone] = useState(false);

  // Step 2 state
  const [parties, setParties] = useState<PartyPrintTarget[]>([]);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);

  // Step 3 state
  const [progress, setProgress] = useState(0);
  const [currentProcessingParty, setCurrentProcessingParty] = useState<PartyPrintTarget | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Keep a ref to the background image as a data URL for html2canvas
  const bgDataUrlRef = useRef<string | null>(null);

  // Load parties when entering step 2
  useEffect(() => {
    if (step === 2 && weddingId) {
      loadParties();
    }
  }, [step, weddingId]);

  const loadParties = async () => {
    setLoadingParties(true);
    try {
      // Fetch parties
      const { data: partiesData } = await supabase
        .from('invite_parties')
        .select('id, party_name, rsvp_status, wedding_id')
        .eq('wedding_id', weddingId);

      // Fetch all guests
      const { data: guestsData } = await supabase
        .from('guests')
        .select('id, first_name, last_name, is_child, unique_rsvp_token, phone, party_id, is_couple_member, is_staff')
        .eq('wedding_id', weddingId);

      if (!partiesData || !guestsData) return;

      // Filter out couple members and staff
      const realGuests = guestsData.filter(g => !g.is_couple_member && !g.is_staff);

      // Build party targets
      const partyTargets: PartyPrintTarget[] = [];

      // Parties with members
      for (const party of partiesData) {
        const members = realGuests.filter(g => g.party_id === party.id);
        if (members.length === 0) continue;

        const rsvpMap: Record<string, PartyPrintTarget['rsvpStatus']> = {
          'Confermato': 'confirmed',
          'Rifiutato': 'declined',
        };

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

      // Solo guests (no party)
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

        // Let React re-render the hidden node
        await new Promise(resolve => setTimeout(resolve, 200));

        const printNode = document.getElementById('hidden-print-node');
        if (!printNode) continue;

        const canvas = await html2canvas(printNode, {
          scale: 2,
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

      // Small delay to let the download start
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

  // Start generation when entering step 3
  useEffect(() => {
    if (step === 3) {
      generatePDF();
    }
  }, [step]);

  const handleClose = () => {
    if (step === 3 && !isSuccess) return; // Block close during generation
    // Cleanup
    setStep(1);
    setProgress(0);
    setCurrentProcessingParty(null);
    setCurrentIndex(0);
    setIsSuccess(false);
    setSelectedPartyIds([]);
    if (backgroundImage?.startsWith('blob:')) {
      URL.revokeObjectURL(backgroundImage);
    }
    setBackgroundImage(null);
    setBackgroundFile(null);
    setWelcomeText('Siamo felici di invitarvi\nal nostro matrimonio');
    setFontStyle('serif');
    setShowSafeZone(false);
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
              {/* Stepper */}
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
                onBackgroundChange={setBackgroundImage}
                welcomeText={welcomeText}
                onWelcomeTextChange={setWelcomeText}
                fontStyle={fontStyle}
                onFontStyleChange={setFontStyle}
                showSafeZone={showSafeZone}
                onShowSafeZoneChange={setShowSafeZone}
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
          welcomeText={welcomeText}
          fontFamily={fontFamily}
          backgroundImageUrl={bgDataUrlRef.current}
        />
      )}
    </>
  );
};

export default PrintInvitationEditor;
