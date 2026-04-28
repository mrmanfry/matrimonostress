import { useState } from "react";
import { Send, Smartphone, Printer, Users, ChevronRight, Upload, Palette, MessageSquare, Settings2, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvitationsKPIs } from "@/components/invitations/InvitationsKPIs";
import { useInvitationsData } from "@/hooks/useInvitationsData";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { computeInvitationsNextAction } from "@/lib/sectionNextActions";
import { RSVPCampaignDialog } from "@/components/guests/RSVPCampaignDialog";
import PrintInvitationEditor from "@/components/print/PrintInvitationEditor";
import PrintStudio from "@/components/invitations/PrintStudio";
import CampaignCard, { CampaignsConfig } from "@/components/settings/CampaignCard";
import CampaignConfigDialog from "@/components/settings/CampaignConfigDialog";
import { RSVPConfigDialog } from "@/components/settings/RSVPConfigDialog";
import { BlockEditorModal } from "@/components/invitations/editor/BlockEditorModal";
import type { PageKind } from "@/lib/invitationBlocks/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
const getDefaultCampaignsConfig = (): CampaignsConfig => ({
  save_the_date: {
    status: "draft",
    enabled: true,
    hero_image_url: null,
    welcome_title: "Save The Date!",
    welcome_text: "Segnati questa data sul calendario!",
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
});

const Invitations = () => {
  const navigate = useNavigate();
  const { parties, wedding, funnelStats, partiesReadyToSend, campaignStats, campaignsConfig: rawCampaignsConfig, isLoading, refetch, weddingId } = useInvitationsData();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [funnelFilter, setFunnelFilter] = useState<string | null>(null);
  const [rsvpCampaignOpen, setRsvpCampaignOpen] = useState(false);
  const [printEditorOpen, setPrintEditorOpen] = useState(false);
  const [printStudioOpen, setPrintStudioOpen] = useState(false);
  

  // Campaign dialog states
  const [stdConfigDialogOpen, setStdConfigDialogOpen] = useState(false);
  const [rsvpCampaignDialogOpen, setRsvpCampaignDialogOpen] = useState(false);
  const [rsvpConfigDialogOpen, setRsvpConfigDialogOpen] = useState(false);
  const [blockEditorPage, setBlockEditorPage] = useState<PageKind | null>(null);

  const campaignsConfig: CampaignsConfig = rawCampaignsConfig || getDefaultCampaignsConfig();

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

  const handleToggleCampaignStatus = async (campaignType: "save_the_date" | "rsvp") => {
    if (!wedding) return;
    
    try {
      const currentStatus = campaignsConfig[campaignType].status;
      const newStatus = currentStatus === "active" ? "draft" : "active";
      
      const updatedConfig = {
        ...campaignsConfig,
        [campaignType]: {
          ...campaignsConfig[campaignType],
          status: newStatus,
        },
      };

      const { error } = await supabase
        .from("weddings")
        .update({ campaigns_config: updatedConfig as any })
        .eq("id", wedding.id);

      if (error) throw error;

      toast({
        title: newStatus === "active" ? "Campagna attivata" : "Campagna in pausa",
        description: newStatus === "active" 
          ? "La campagna è ora attiva e visibile agli invitati"
          : "La campagna è stata messa in pausa",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePreviewCampaign = (campaignType: "save_the_date" | "rsvp") => {
    const path = campaignType === "save_the_date" 
      ? "/save-the-date/preview" 
      : "/rsvp/preview";
    window.open(path, "_blank");
  };

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

  const partnerNames = wedding ? `${wedding.partner1_name} & ${wedding.partner2_name}` : "";
  const weddingDate = (wedding as any)?.wedding_date || "";

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl">
      {/* Section Header v1 */}
      {(() => {
        const lastStdSentDate = parties
          .flatMap((p) => p.guests.map((g) => g.save_the_date_sent_at))
          .filter((d): d is string => !!d)
          .sort()
          .pop();
        const stdSentDaysAgo = lastStdSentDate
          ? Math.floor(
              (Date.now() - new Date(lastStdSentDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

        const nextAction = computeInvitationsNextAction({
          partiesReadyToSendCount: partiesReadyToSend,
          stdSent: campaignStats?.save_the_date.sent || 0,
          stdResponded: campaignStats?.save_the_date.responded || 0,
          stdSentDaysAgo,
          formalInvitesSent: funnelStats.invited + funnelStats.confirmed + funnelStats.declined,
          totalRegular: funnelStats.totalRegular,
          onPrepareInvite: () => setRsvpCampaignOpen(true),
          onRemindStd: () => setStdConfigDialogOpen(true),
        });

        return (
          <SectionHeader
            icon={<Send className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0" />}
            title="Campagne"
            metadata="Invia le partecipazioni, gestisci le pagine pubbliche e monitora le risposte"
            dataViz={{
              type: "funnel",
              stages: [
                { label: "Destinatari", count: funnelStats.totalRegular },
                {
                  label: "Save the Date",
                  count: campaignStats?.save_the_date.sent || 0,
                },
                { label: "Inviti formali", count: funnelStats.invited + funnelStats.confirmed + funnelStats.declined },
                { label: "Confermati", count: funnelStats.confirmed },
              ],
            }}
            nextAction={nextAction}
          />
        );
      })()}

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Panoramica & Invii</span>
              <span className="sm:hidden">Panoramica</span>
            </TabsTrigger>
            <TabsTrigger value="pages" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Pagine Pubbliche</span>
              <span className="sm:hidden">Pagine</span>
            </TabsTrigger>
            <TabsTrigger value="print" className="gap-2">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Studio</span>
              <span className="sm:hidden">Stampa</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB: Panoramica & Invii */}
          <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-4">
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

              {/* Print Card - redirect to Print Studio tab */}
              <Card
                className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"
                onClick={() => setActiveTab("print")}
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
                        Vai al Print Studio →
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: Pagine Pubbliche */}
          <TabsContent value="pages" className="space-y-6 mt-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Campagne di Comunicazione
              </h2>
              <p className="text-muted-foreground text-sm">
                Gestisci le pagine che vedranno i tuoi invitati quando ricevono il link
              </p>
            </div>

            {/* Campaign Cards Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <CampaignCard
                type="save_the_date"
                config={campaignsConfig.save_the_date}
                stats={campaignStats?.save_the_date || { sent: 0, responded: 0 }}
                onConfigure={() => setStdConfigDialogOpen(true)}
                onPreview={() => handlePreviewCampaign("save_the_date")}
                onToggleStatus={() => handleToggleCampaignStatus("save_the_date")}
                onAdvancedEditor={() => setBlockEditorPage("std")}
              />
              
              <CampaignCard
                type="rsvp"
                config={campaignsConfig.rsvp}
                stats={campaignStats?.rsvp || { sent: 0, responded: 0 }}
                onConfigure={() => setRsvpCampaignDialogOpen(true)}
                onPreview={() => handlePreviewCampaign("rsvp")}
                onToggleStatus={() => handleToggleCampaignStatus("rsvp")}
                onAdvancedEditor={() => setBlockEditorPage("rsvp")}
              />
            </div>

            {/* Theme Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Stile Globale
                </CardTitle>
                <CardDescription>
                  Queste impostazioni vengono applicate a tutte le pagine pubbliche
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Font:</span>
                    <span className="font-medium capitalize">{campaignsConfig.theme.font_family}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Colore:</span>
                    <div 
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: campaignsConfig.theme.primary_color }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Countdown:</span>
                    <span className="font-medium">{campaignsConfig.theme.show_countdown ? "Sì" : "No"}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  💡 Modifica lo stile dalla configurazione di ciascuna campagna
                </p>
              </CardContent>
            </Card>

            {/* Legacy RSVP Config */}
            <Card className="opacity-60">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Configurazione Legacy (RSVP)
                </CardTitle>
                <CardDescription>
                  Impostazioni precedenti della pagina RSVP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setRsvpConfigDialogOpen(true)} variant="outline" size="sm">
                  Apri Configurazione Legacy
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Print Studio */}
          <TabsContent value="print" className="space-y-6 mt-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Printer className="w-5 h-5" />
                Print Studio
              </h2>
              <p className="text-muted-foreground text-sm">
                Genera inviti cartacei con QR code personalizzato per ogni nucleo
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                onClick={() => setPrintEditorOpen(true)}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Palette className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Design Integrato</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Usa il nostro editor con foto, font e layout A5
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                onClick={() => setPrintStudioOpen(true)}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Upload className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Carica il tuo Design</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF o immagine da Canva/Designer + QR code automatico
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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
        coupleName={partnerNames}
        preSelectedGuestIds={new Set()}
        onDataChange={refetch}
      />

      <PrintInvitationEditor
        open={printEditorOpen}
        onOpenChange={setPrintEditorOpen}
        weddingId={weddingId || ""}
      />

      <PrintStudio
        open={printStudioOpen}
        onOpenChange={setPrintStudioOpen}
        weddingId={weddingId || ""}
      />

      {/* Campaign Config Dialogs */}
      <CampaignConfigDialog
        open={stdConfigDialogOpen}
        onOpenChange={setStdConfigDialogOpen}
        weddingId={weddingId || ""}
        campaignType="save_the_date"
        currentConfig={campaignsConfig}
        partnerNames={partnerNames}
        weddingDate={weddingDate}
        onSave={() => refetch()}
      />

      <CampaignConfigDialog
        open={rsvpCampaignDialogOpen}
        onOpenChange={setRsvpCampaignDialogOpen}
        weddingId={weddingId || ""}
        campaignType="rsvp"
        currentConfig={campaignsConfig}
        partnerNames={partnerNames}
        weddingDate={weddingDate}
        onSave={() => refetch()}
      />

      <RSVPConfigDialog
        open={rsvpConfigDialogOpen}
        onOpenChange={setRsvpConfigDialogOpen}
        weddingId={weddingId || ""}
        currentConfig={(wedding as any)?.rsvp_config || null}
        onSave={() => refetch()}
      />
    </div>
  );
};

export default Invitations;
