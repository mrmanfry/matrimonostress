import { useState, lazy, Suspense } from "react";
import { Send, Smartphone, Printer, Users, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { InvitationsKPIs } from "@/components/invitations/InvitationsKPIs";
import { useInvitationsData } from "@/hooks/useInvitationsData";
import { RSVPCampaignDialog } from "@/components/guests/RSVPCampaignDialog";
import PrintInvitationEditor from "@/components/print/PrintInvitationEditor";

const Invitations = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { guests, parties, wedding, funnelStats, partiesReadyToSend, isLoading, refetch, weddingId } = useInvitationsData();

  const [funnelFilter, setFunnelFilter] = useState<string | null>(null);
  const [rsvpCampaignOpen, setRsvpCampaignOpen] = useState(false);
  const [printEditorOpen, setPrintEditorOpen] = useState(false);

  // Check if there's a saved campaign in localStorage to auto-reopen
  useState(() => {
    if (wedding?.id) {
      const savedProgress = localStorage.getItem("rsvp_campaign_progress");
      if (savedProgress) {
        try {
          const parsed = JSON.parse(savedProgress);
          const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
          if (isRecent && parsed.weddingId === wedding.id) {
            setRsvpCampaignOpen(true);
          }
        } catch {
          localStorage.removeItem("rsvp_campaign_progress");
        }
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Caricamento campagne...</p>
        </div>
      </div>
    );
  }

  const hasNoParties = parties.filter(p => p.guests.some(g => !g.is_couple_member)).length === 0;

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
          <Send className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0" />
          <span>Campagne</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Invia le partecipazioni e monitora le risposte
        </p>
      </div>

      {/* Empty state: no parties */}
      {hasNoParties ? (
        <Card className="p-8 md:p-12">
          <div className="text-center space-y-4">
            <Users className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl md:text-2xl font-semibold">Nessun nucleo familiare</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Per inviare le partecipazioni, prima aggiungi i tuoi invitati e raggruppali in nuclei familiari nella sezione Invitati.
            </p>
            <Button onClick={() => navigate("/app/guests")} className="gap-2">
              <Users className="w-4 h-4" />
              Vai agli Invitati
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Funnel KPIs */}
          <InvitationsKPIs
            stats={funnelStats}
            activeFilter={funnelFilter}
            onFilterChange={setFunnelFilter}
          />

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WhatsApp Card */}
            <Card
              className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30"
              onClick={() => setRsvpCampaignOpen(true)}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/50">
                  <Smartphone className="w-8 h-8 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">Invia su WhatsApp</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Genera messaggi personalizzati con link RSVP e inviali tramite WhatsApp
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-medium">
                      {partiesReadyToSend} nuclei pronti
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Print Card */}
            <Card
              className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"
              onClick={() => setPrintEditorOpen(true)}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50">
                  <Printer className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">Prepara per la Stampa</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Genera inviti cartacei con QR code personalizzato per ogni nucleo
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                      Inviti A5 pieghevoli
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Dialogs */}
      <RSVPCampaignDialog
        open={rsvpCampaignOpen}
        onOpenChange={(open) => {
          setRsvpCampaignOpen(open);
          if (!open) refetch();
        }}
        selectedParties={parties.map(p => ({
          ...p,
          rsvp_status: p.rsvp_status as 'In attesa' | 'Confermato' | 'Rifiutato',
          guests: p.guests.map(g => ({
            ...g,
            wedding_id: weddingId || "",
            is_child: false,
            adults_count: 1,
            children_count: 0,
            rsvp_send_status: g.rsvp_send_status as 'Non Inviato' | 'Inviato' | 'Fallito',
          })),
        }))}
        weddingId={weddingId || ""}
        coupleName={wedding ? `${wedding.partner1_name} & ${wedding.partner2_name}` : ""}
        preSelectedGuestIds={new Set()}
        onDataChange={refetch}
      />

      <PrintInvitationEditor
        open={printEditorOpen}
        onOpenChange={setPrintEditorOpen}
        weddingId={weddingId || ""}
      />
    </div>
  );
};

export default Invitations;
