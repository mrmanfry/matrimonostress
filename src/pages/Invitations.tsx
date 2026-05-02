import { useState, useMemo } from "react";
import {
  Send,
  Smartphone,
  Printer,
  Users,
  ChevronRight,
  Upload,
  Palette,
  BarChart3,
  Monitor,
  Check,
  Info,
  FileText,
  Calendar,
  Mail,
  CheckCircle,
  XCircle,
  Settings2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useInvitationsData } from "@/hooks/useInvitationsData";
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
import { cn } from "@/lib/utils";

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

/* ============================================================================
 * Recent Activity helpers — derive from real guest data, no fake entries.
 * ========================================================================== */

interface ActivityEntry {
  who: string;
  what: string;
  when: string;
  tone: "success" | "danger" | "brand";
  ts: number;
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "ora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} or${h === 1 ? "a" : "e"} fa`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ieri";
  if (d < 7) return `${d} giorni fa`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} settiman${w === 1 ? "a" : "e"} fa`;
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

/* ============================================================================
 * Page
 * ========================================================================== */

const Invitations = () => {
  const navigate = useNavigate();
  const {
    parties,
    wedding,
    funnelStats,
    partiesReadyToSend,
    campaignStats,
    campaignsConfig: rawCampaignsConfig,
    isLoading,
    refetch,
    weddingId,
  } = useInvitationsData();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "pages" | "print">("overview");
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

  // Auto-reopen RSVP wizard if recent draft
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
        [campaignType]: { ...campaignsConfig[campaignType], status: newStatus },
      };
      const { error } = await supabase
        .from("weddings")
        .update({ campaigns_config: updatedConfig as any })
        .eq("id", wedding.id);
      if (error) throw error;
      toast({
        title: newStatus === "active" ? "Campagna attivata" : "Campagna in pausa",
        description:
          newStatus === "active"
            ? "La campagna è ora attiva e visibile agli invitati"
            : "La campagna è stata messa in pausa",
      });
      refetch();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  };

  const handlePreviewCampaign = (campaignType: "save_the_date" | "rsvp") => {
    const path = campaignType === "save_the_date" ? "/save-the-date/preview" : "/rsvp/preview";
    window.open(path, "_blank");
  };

  /* -- Recent activity derived from guests timestamps -- */
  const recentActivity: ActivityEntry[] = useMemo(() => {
    const partyOf = (guestId: string) => {
      const p = parties.find((p) => p.guests.some((g) => g.id === guestId));
      return p?.party_name || "Invitato";
    };
    const entries: ActivityEntry[] = [];
    parties.forEach((p) => {
      p.guests.forEach((g) => {
        if (g.is_couple_member) return;
        if (g.std_responded_at) {
          const tone =
            g.std_response === "likely_yes"
              ? "success"
              : g.std_response === "likely_no"
              ? "danger"
              : "brand";
          const what =
            g.std_response === "likely_yes"
              ? "ha indicato che probabilmente verrà"
              : g.std_response === "likely_no"
              ? "ha indicato che probabilmente non verrà"
              : "ha aperto il Save the Date";
          entries.push({
            who: p.party_name,
            what,
            when: relativeTime(new Date(g.std_responded_at)),
            tone,
            ts: new Date(g.std_responded_at).getTime(),
          });
        }
        if (g.rsvp_status === "confirmed" && g.formal_invite_sent_at) {
          entries.push({
            who: p.party_name,
            what: "ha confermato la presenza",
            when: relativeTime(new Date(g.formal_invite_sent_at)),
            tone: "success",
            ts: new Date(g.formal_invite_sent_at).getTime(),
          });
        }
        if (g.rsvp_status === "declined" && g.formal_invite_sent_at) {
          entries.push({
            who: p.party_name,
            what: "ha declinato l'invito",
            when: relativeTime(new Date(g.formal_invite_sent_at)),
            tone: "danger",
            ts: new Date(g.formal_invite_sent_at).getTime(),
          });
        }
      });
    });
    // dedupe by who+what, keep most recent
    const map = new Map<string, ActivityEntry>();
    entries.forEach((e) => {
      const k = `${e.who}|${e.what}`;
      const prev = map.get(k);
      if (!prev || e.ts > prev.ts) map.set(k, e);
    });
    return Array.from(map.values()).sort((a, b) => b.ts - a.ts).slice(0, 4);
  }, [parties]);

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

  const hasNoParties =
    parties.filter((p) => p.guests.some((g) => !g.is_couple_member)).length === 0;

  const partnerNames = wedding ? `${wedding.partner1_name} & ${wedding.partner2_name}` : "";
  const weddingDate = (wedding as any)?.wedding_date || "";

  /* -- Macro funnel for header -- */
  const stdSent = campaignStats?.save_the_date.sent || 0;
  const formalSent = funnelStats.invited + funnelStats.confirmed + funnelStats.declined;
  const headerFunnel = [
    { label: "Destinatari", count: funnelStats.totalRegular },
    { label: "Save the Date", count: stdSent },
    { label: "Inviti formali", count: formalSent },
    { label: "Confermati", count: funnelStats.confirmed },
  ];
  const baseCount = Math.max(headerFunnel[0].count, 1);

  /* -- Stage funnel for overview tab -- */
  type Tone = "neutral" | "gold" | "warn" | "success" | "danger";
  const stageCards: Array<{
    id: string;
    label: string;
    count: number;
    tone: Tone;
    icon: typeof FileText;
  }> = [
    { id: "draft", label: "Da Contattare", count: funnelStats.draft, tone: "neutral", icon: FileText },
    { id: "std_sent", label: "Save the Date", count: funnelStats.std_sent, tone: "gold", icon: Calendar },
    { id: "invited", label: "In Attesa Risposta", count: funnelStats.invited, tone: "warn", icon: Mail },
    { id: "confirmed", label: "Confermati", count: funnelStats.confirmed, tone: "success", icon: CheckCircle },
    { id: "declined", label: "Non Vengono", count: funnelStats.declined, tone: "danger", icon: XCircle },
  ];

  const toneStyles: Record<Tone, { bg: string; fg: string; border: string; dot: string; ring: string }> = {
    neutral: {
      bg: "bg-card",
      fg: "text-foreground/70",
      border: "border-border",
      dot: "bg-muted-foreground",
      ring: "ring-muted-foreground/30",
    },
    gold: {
      bg: "bg-[hsl(43_55%_94%)] dark:bg-amber-950/30",
      fg: "text-[hsl(35_55%_28%)] dark:text-amber-300",
      border: "border-[hsl(43_45%_82%)] dark:border-amber-800",
      dot: "bg-[hsl(40_75%_45%)]",
      ring: "ring-[hsl(40_75%_45%)]/40",
    },
    warn: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      fg: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800",
      dot: "bg-amber-500",
      ring: "ring-amber-500/40",
    },
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      fg: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800",
      dot: "bg-emerald-600",
      ring: "ring-emerald-500/40",
    },
    danger: {
      bg: "bg-red-50 dark:bg-red-950/30",
      fg: "text-red-700 dark:text-red-300",
      border: "border-red-200 dark:border-red-800",
      dot: "bg-red-600",
      ring: "ring-red-500/40",
    },
  };

  const tabs = [
    { id: "overview" as const, label: "Panoramica & Invii", icon: BarChart3, count: null as number | null },
    { id: "pages" as const, label: "Pagine Pubbliche", icon: Monitor, count: 2 },
    { id: "print" as const, label: "Print Studio", icon: Printer, count: null },
  ];

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-5 md:space-y-6 max-w-[1480px]">
      {/* ============================================================
       * HEADER — sempre visibile sopra le tab
       * ============================================================ */}
      <Card className="p-5 md:p-6 shadow-sm">
        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
          {/* Left: title + funnel */}
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-primary/15 to-primary/25 text-primary border border-primary/20 inline-flex items-center justify-center">
                <Send className="w-[18px] h-[18px]" />
              </div>
              <h1 className="m-0 font-serif text-2xl md:text-[26px] font-medium tracking-tight">
                Campagne
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-[520px] mb-4">
              Invia le partecipazioni, gestisci le pagine pubbliche e monitora le risposte.
            </p>

            {/* Horizontal macro-funnel */}
            <div className="flex items-center bg-muted/50 border border-border rounded-[10px] py-2.5 px-1">
              {headerFunnel.map((s, i) => {
                const pct = s.count / baseCount;
                const isLast = i === headerFunnel.length - 1;
                return (
                  <div key={s.label} className="flex items-center flex-1 min-w-0">
                    <div className="flex-1 px-3.5 flex flex-col gap-1 min-w-0">
                      <div className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground font-medium truncate">
                        {s.label}
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={cn(
                            "font-serif text-[22px] font-medium leading-none tracking-tight",
                            isLast ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                          )}
                        >
                          {s.count}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {Math.round(pct * 100)}%
                        </span>
                      </div>
                      <div className="h-1 bg-border rounded overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded transition-all",
                            isLast ? "bg-emerald-500" : "bg-primary"
                          )}
                          style={{ width: `${Math.min(pct * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    {i < headerFunnel.length - 1 && (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Next action gradient card */}
          <div
            className="rounded-xl p-5 text-white min-w-[260px] max-w-[340px] shadow-[0_8px_24px_-10px_hsl(258_89%_60%/.5)]"
            style={{
              background: "linear-gradient(140deg, hsl(258 89% 66%) 0%, hsl(258 80% 55%) 100%)",
            }}
          >
            <div className="text-[11px] uppercase tracking-[0.16em] font-semibold opacity-85">
              Prossima azione
            </div>
            <div className="font-serif text-[18px] font-medium mt-1.5 leading-tight">
              Prepara una nuova partecipazione
            </div>
            <div className="text-[12.5px] opacity-95 mt-1.5">
              <strong className="font-semibold">{partiesReadyToSend}</strong> nuclei sono pronti per
              ricevere l'invito.
            </div>
            <button
              onClick={() => setRsvpCampaignOpen(true)}
              className="mt-3 h-9 px-3.5 bg-white text-primary rounded-lg font-medium text-[13px] inline-flex items-center gap-1.5 hover:bg-white/95 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Crea campagna
            </button>
          </div>
        </div>
      </Card>

      {hasNoParties ? (
        <Card className="p-8 md:p-12">
          <div className="text-center space-y-4">
            <Users className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl md:text-2xl font-semibold">Nessun nucleo familiare</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Per inviare le partecipazioni, prima aggiungi i tuoi invitati e raggruppali in nuclei
              familiari nella sezione Invitati.
            </p>
            <Button onClick={() => navigate("/app/guests")} className="gap-2">
              <Users className="w-4 h-4" />
              Vai agli Invitati
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* ========================================================
           * Tab bar (custom, branded)
           * ======================================================== */}
          <div className="inline-flex items-center gap-1 p-1 bg-card border border-border rounded-xl shadow-sm w-fit">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "h-9 px-3.5 rounded-lg text-[13px] inline-flex items-center gap-2 transition-all border-none cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "bg-transparent text-muted-foreground font-normal hover:bg-muted"
                  )}
                >
                  <Icon className="w-[15px] h-[15px]" />
                  {t.label}
                  {t.count != null && (
                    <span
                      className={cn(
                        "h-[19px] px-[7px] text-[11px] font-semibold inline-flex items-center rounded-full border border-border",
                        isActive ? "bg-background text-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ========================================================
           * TAB 1 — Panoramica & Invii
           * ======================================================== */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-5 md:gap-6">
              {/* Funnel stages */}
              <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h2 className="m-0 font-serif text-[17px] font-medium">Il tuo percorso inviti</h2>
                  <div className="text-[11.5px] text-muted-foreground">
                    Tap su uno stato per filtrare gli invitati
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {stageCards.map((s, i) => {
                    const t = toneStyles[s.tone];
                    const isActive = funnelFilter === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          const next = isActive ? null : s.id;
                          setFunnelFilter(next);
                          if (next) navigate(`/app/guests?funnel=${next}`);
                        }}
                        className={cn(
                          "relative text-left rounded-xl border p-3.5 transition-all cursor-pointer hover:shadow-md",
                          t.bg,
                          t.border,
                          isActive && cn("ring-2", t.ring)
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", t.dot)} />
                          <span className={cn("text-[11px] font-medium tracking-[0.02em]", t.fg)}>
                            {s.label}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "font-serif text-[28px] font-medium leading-none tracking-tight",
                            t.fg
                          )}
                        >
                          {s.count}
                        </div>
                        {i < stageCards.length - 1 && (
                          <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-[2] text-muted-foreground/60">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Two action cards */}
              <div>
                <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                  <h2 className="m-0 font-serif text-[17px] font-medium">Cosa vuoi fare adesso?</h2>
                  <div className="text-[11.5px] text-muted-foreground">
                    Le 2 azioni più importanti del momento
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <ActionCard
                    tone="green"
                    icon={Smartphone}
                    title="Sollecita risposte mancanti"
                    desc={
                      funnelStats.std_no_response > 0
                        ? `${funnelStats.std_no_response} nuclei non hanno ancora risposto al Save The Date. Inviamo un sollecito personale via WhatsApp con un copy che si adatta al tono familiare.`
                        : "Invia una nuova partecipazione personalizzata via WhatsApp con copy che si adatta al tono familiare."
                    }
                    badge={
                      funnelStats.std_no_response > 0
                        ? `${funnelStats.std_no_response} da contattare · Apertura ~95%`
                        : `${partiesReadyToSend} nuclei pronti`
                    }
                    onClick={() => setRsvpCampaignOpen(true)}
                  />
                  <ActionCard
                    tone="blue"
                    icon={Printer}
                    title="Genera inviti cartacei"
                    desc="Stampa partecipazioni A5 con QR code univoci per ogni nucleo. Editor con foto + font, oppure carica il design del tuo grafico."
                    badge={`${partiesReadyToSend} nuclei pronti per la stampa`}
                    onClick={() => setActiveTab("print")}
                  />
                </div>
              </div>

              {/* Recent activity */}
              {recentActivity.length > 0 && (
                <Card className="p-4 md:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="m-0 font-serif text-[16px] font-medium">Attività recente</h3>
                    <button
                      onClick={() => navigate("/app/guests")}
                      className="text-[12px] text-primary bg-transparent border-none cursor-pointer hover:underline"
                    >
                      Vedi tutto →
                    </button>
                  </div>
                  <div>
                    {recentActivity.map((a, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-3 py-2.5",
                          i < recentActivity.length - 1 && "border-b border-border"
                        )}
                      >
                        <Avatar name={a.who} />
                        <div className="flex-1 min-w-0 text-[13px] text-muted-foreground truncate">
                          <strong className="text-foreground font-medium">{a.who}</strong> {a.what}
                        </div>
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                            a.tone === "success" && "bg-emerald-500",
                            a.tone === "danger" && "bg-red-500",
                            a.tone === "brand" && "bg-primary"
                          )}
                        />
                        <div className="text-[11.5px] text-muted-foreground min-w-[80px] text-right">
                          {a.when}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ========================================================
           * TAB 2 — Pagine Pubbliche
           * ======================================================== */}
          {activeTab === "pages" && (
            <div className="flex flex-col gap-5 md:gap-6">
              <div>
                <h2 className="m-0 mb-1.5 font-serif text-[17px] font-medium">
                  Le tue pagine pubbliche
                </h2>
                <p className="m-0 text-[12.5px] text-muted-foreground">
                  Quello che vedono i tuoi invitati quando aprono il link. Layout, font e colori sono
                  condivisi.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
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

              {/* Style global */}
              <Card className="p-4 md:p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Palette className="w-4 h-4 text-primary" />
                  <h3 className="m-0 font-serif text-[16px] font-medium">Stile Globale</h3>
                </div>
                <p className="text-[12.5px] text-muted-foreground mb-3">
                  Queste impostazioni vengono applicate a tutte le pagine pubbliche.
                </p>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Font:</span>
                    <span className="font-medium capitalize">
                      {campaignsConfig.theme.font_family}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Colore:</span>
                    <div
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: campaignsConfig.theme.primary_color }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Countdown:</span>
                    <span className="font-medium">
                      {campaignsConfig.theme.show_countdown ? "Sì" : "No"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Legacy access */}
              <Card className="p-4 md:p-5 shadow-sm opacity-70">
                <div className="flex items-center gap-2 mb-1">
                  <Settings2 className="w-4 h-4" />
                  <h3 className="m-0 font-serif text-[15px] font-medium">
                    Configurazione Legacy (RSVP)
                  </h3>
                </div>
                <p className="text-[12.5px] text-muted-foreground mb-3">
                  Impostazioni precedenti della pagina RSVP.
                </p>
                <Button
                  onClick={() => setRsvpConfigDialogOpen(true)}
                  variant="outline"
                  size="sm"
                >
                  Apri Configurazione Legacy
                </Button>
              </Card>
            </div>
          )}

          {/* ========================================================
           * TAB 3 — Print Studio
           * ======================================================== */}
          {activeTab === "print" && (
            <div className="flex flex-col gap-5 md:gap-6">
              <div>
                <h2 className="m-0 mb-1.5 font-serif text-[17px] font-medium">Print Studio</h2>
                <p className="m-0 text-[12.5px] text-muted-foreground">
                  Genera partecipazioni cartacee A5 con QR univoco. Scegli se progettare l'invito da
                  zero o caricare un design già pronto.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PrintModeCard
                  isPrimary
                  icon={Palette}
                  badge="Consigliato"
                  title="Design integrato"
                  desc="Editor A5 con foto, font e layout. Modifica testi e posizione del QR direttamente in anteprima."
                  bullets={[
                    "Editor visuale A5",
                    "Foto + font integrati",
                    "Stile coordinato con la pagina online",
                  ]}
                  cta="Apri editor"
                  onClick={() => setPrintEditorOpen(true)}
                />
                <PrintModeCard
                  icon={Upload}
                  badge="Per chi ha già un grafico"
                  title="Carica il tuo design"
                  desc="Hai già un PDF o un'immagine dal tuo designer? Caricalo, posiziona il QR univoco e siamo pronti."
                  bullets={[
                    "PDF, JPG, PNG",
                    "Posiziona il QR a piacere",
                    "Generazione QR automatica per nucleo",
                  ]}
                  cta="Carica file"
                  onClick={() => setPrintStudioOpen(true)}
                />
              </div>

              <Card className="p-4 md:p-5 shadow-sm flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium">Come funzionano i QR code</div>
                  <div className="text-[12.5px] text-muted-foreground mt-0.5 leading-relaxed">
                    Ogni nucleo riceve un QR univoco che porta direttamente alla pagina di conferma
                    personalizzata. Tracciamo aperture e risposte.
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ============================================================
       * Dialogs (logica invariata)
       * ============================================================ */}
      <RSVPCampaignDialog
        open={rsvpCampaignOpen}
        onOpenChange={(open) => {
          setRsvpCampaignOpen(open);
          if (!open) refetch();
        }}
        selectedParties={parties.map((p) => ({
          ...p,
          rsvp_status: p.rsvp_status as "In attesa" | "Confermato" | "Rifiutato",
          guests: p.guests.map((g) => ({
            ...g,
            wedding_id: weddingId || "",
            is_child: false,
            adults_count: 1,
            children_count: 0,
            rsvp_send_status: g.rsvp_send_status as "Non Inviato" | "Inviato" | "Fallito",
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

      {blockEditorPage && weddingId && (
        <BlockEditorModal
          open={!!blockEditorPage}
          onOpenChange={(o) => !o && setBlockEditorPage(null)}
          weddingId={weddingId}
          pageKind={blockEditorPage}
          partnerNames={partnerNames}
          weddingDate={weddingDate}
          primaryColor={campaignsConfig.theme.primary_color}
          onSaved={() => refetch()}
        />
      )}
    </div>
  );
};

/* ============================================================================
 * Sub-components
 * ========================================================================== */

interface ActionCardProps {
  tone: "green" | "blue";
  icon: typeof Smartphone;
  title: string;
  desc: string;
  badge: string;
  onClick: () => void;
}
const ActionCard = ({ tone, icon: Icon, title, desc, badge, onClick }: ActionCardProps) => {
  const styles =
    tone === "green"
      ? {
          bg: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20",
          border: "border-emerald-200 dark:border-emerald-800",
          iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
          iconFg: "text-emerald-700 dark:text-emerald-400",
          badgeBg: "bg-emerald-100 dark:bg-emerald-900/50",
          badgeFg: "text-emerald-800 dark:text-emerald-300",
        }
      : {
          bg: "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/20",
          border: "border-blue-200 dark:border-blue-800",
          iconBg: "bg-blue-100 dark:bg-blue-900/50",
          iconFg: "text-blue-700 dark:text-blue-400",
          badgeBg: "bg-blue-100 dark:bg-blue-900/50",
          badgeFg: "text-blue-800 dark:text-blue-300",
        };
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-5 flex items-start gap-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg",
        styles.bg,
        styles.border
      )}
    >
      <div
        className={cn(
          "w-13 h-13 min-w-[52px] h-[52px] rounded-xl inline-flex items-center justify-center flex-shrink-0",
          styles.iconBg,
          styles.iconFg
        )}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-serif text-[17px] font-medium tracking-tight">{title}</div>
        <div className="text-[12.5px] text-muted-foreground mt-1 leading-snug">{desc}</div>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-[11.5px] font-semibold",
            styles.badgeBg,
            styles.badgeFg
          )}
        >
          {badge}
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </button>
  );
};

interface PrintModeCardProps {
  isPrimary?: boolean;
  icon: typeof Palette;
  badge: string;
  title: string;
  desc: string;
  bullets: string[];
  cta: string;
  onClick: () => void;
}
const PrintModeCard = ({
  isPrimary,
  icon: Icon,
  badge,
  title,
  desc,
  bullets,
  cta,
  onClick,
}: PrintModeCardProps) => {
  return (
    <Card
      className={cn(
        "p-5 md:p-6 flex flex-col shadow-sm relative overflow-hidden",
        isPrimary
          ? "bg-gradient-to-br from-primary/10 via-primary/5 to-card border-primary/20"
          : "bg-card border-border"
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3.5">
        <div
          className={cn(
            "w-13 h-13 min-w-[52px] h-[52px] rounded-xl inline-flex items-center justify-center",
            isPrimary
              ? "bg-background text-primary shadow-sm"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <span
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-semibold border",
            isPrimary
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-muted text-muted-foreground border-border"
          )}
        >
          {badge}
        </span>
      </div>
      <div className="font-serif text-[19px] font-medium tracking-tight">{title}</div>
      <div className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{desc}</div>
      <ul className="my-3.5 p-0 list-none flex flex-col gap-1.5">
        {bullets.map((b, i) => (
          <li
            key={i}
            className="text-[12.5px] text-muted-foreground flex items-center gap-2"
          >
            <span
              className={cn(
                "w-3.5 h-3.5 rounded-full inline-flex items-center justify-center flex-shrink-0",
                isPrimary
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Check className="w-2.5 h-2.5" strokeWidth={3} />
            </span>
            {b}
          </li>
        ))}
      </ul>
      <Button
        onClick={onClick}
        className={cn("self-start gap-2", !isPrimary && "bg-foreground text-background hover:bg-foreground/90")}
        variant={isPrimary ? "default" : "secondary"}
      >
        <Icon className="w-4 h-4" />
        {cta}
      </Button>
    </Card>
  );
};

interface AvatarProps {
  name: string;
}
const Avatar = ({ name }: AvatarProps) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");
  // deterministic hue from name
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return (
    <div
      className="w-[30px] h-[30px] rounded-full inline-flex items-center justify-center text-[11px] font-semibold flex-shrink-0 text-white"
      style={{ background: `hsl(${hue} 55% 50%)` }}
    >
      {initials || "?"}
    </div>
  );
};

export default Invitations;
