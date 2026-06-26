import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Undo2, Redo2, Smartphone, RotateCcw, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { InvitationPageSchema, PageKind } from "@/lib/invitationBlocks/types";
import { makeDefaultRsvpPage, makeDefaultStdPage } from "@/lib/invitationBlocks/defaults";
import { useInvitationPageEditor } from "@/hooks/useInvitationPageEditor";
import { BlockListEditor } from "./BlockListEditor";
import { AddBlockMenu } from "./AddBlockMenu";
import { BlockInspector } from "./BlockInspector";
import { BlockStyleEditor } from "./BlockStyleEditor";
import { BLOCK_META } from "./blockMeta";
import { PublicInvitationPage } from "@/components/publicInvitation/PublicInvitationPage";
import type { WeddingPublicData } from "@/components/publicInvitation/blocks/_shared";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
  pageKind: PageKind;
  partnerNames: string;
  weddingDate: string;
  primaryColor: string;
  onSaved: () => void;
}

export function BlockEditorModal({
  open,
  onOpenChange,
  weddingId,
  pageKind,
  partnerNames,
  weddingDate,
  primaryColor,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewWedding, setPreviewWedding] = useState<WeddingPublicData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState<string>("");
  const [whatsappTemplate, setWhatsappTemplate] = useState<string>("");

  const editor = useInvitationPageEditor(
    pageKind === "rsvp" ? makeDefaultRsvpPage() : makeDefaultStdPage()
  );

  // Load schema from DB (or build default)
  useEffect(() => {
    if (!open || !weddingId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("weddings")
        .select(
          "campaigns_config, ceremony_venue_name, ceremony_venue_address, ceremony_start_time, reception_venue_name, reception_venue_address, reception_start_time, location, timezone"
        )
        .eq("id", weddingId)
        .single();
      if (cancelled) return;

      const cfg = (data?.campaigns_config as any) || {};
      const pages = cfg.pages || {};
      const stored = pages[pageKind] as InvitationPageSchema | undefined;
      const initial =
        stored && Array.isArray(stored.blocks) && stored.blocks.length > 0
          ? stored
          : pageKind === "rsvp"
          ? makeDefaultRsvpPage()
          : makeDefaultStdPage();
      editor.reset(initial);

      // Load campaign-level settings (legacy fields kept for backward compat)
      const legacyCampaignKey = pageKind === "rsvp" ? "rsvp" : "save_the_date";
      const legacyCampaign = (cfg[legacyCampaignKey] as any) || {};
      setDeadlineDate(legacyCampaign.deadline_date || "");
      setWhatsappTemplate(legacyCampaign.whatsapp_message_template || "");

      const [p1, p2] = (partnerNames || "").split("&").map((s) => s.trim());
      setPreviewWedding({
        partner1Name: p1 || partnerNames || "Anna",
        partner2Name: p2 || "Marco",
        weddingDate:
          weddingDate ||
          new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        timezone: data?.timezone || "Europe/Rome",
        location: data?.location || null,
        ceremonyVenueName: data?.ceremony_venue_name || null,
        ceremonyVenueAddress: data?.ceremony_venue_address || null,
        ceremonyStartTime: data?.ceremony_start_time || null,
        receptionVenueName: data?.reception_venue_name || null,
        receptionVenueAddress: data?.reception_venue_address || null,
        receptionStartTime: data?.reception_start_time || null,
        theme: { primaryColor },
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, weddingId, pageKind]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: current } = await supabase
        .from("weddings")
        .select("campaigns_config")
        .eq("id", weddingId)
        .single();

      const cfg = (current?.campaigns_config as any) || {};
      const pages = { ...(cfg.pages || {}) };
      pages[pageKind] = editor.schema;

      // Persist campaign-level settings into the legacy campaign branch (used by
      // public pages as fallback and by status/deadline checks).
      const legacyCampaignKey = pageKind === "rsvp" ? "rsvp" : "save_the_date";
      const legacyCampaign = { ...((cfg[legacyCampaignKey] as any) || {}) };
      legacyCampaign.deadline_date = deadlineDate || null;
      legacyCampaign.whatsapp_message_template = whatsappTemplate || null;

      const updated = { ...cfg, pages, [legacyCampaignKey]: legacyCampaign };

      const { error } = await supabase
        .from("weddings")
        .update({ campaigns_config: updated as any })
        .eq("id", weddingId);
      if (error) throw error;

      toast({ title: "Layout salvato", description: "Le modifiche sono attive" });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    editor.reset(pageKind === "rsvp" ? makeDefaultRsvpPage() : makeDefaultStdPage());
  };

  const selectedBlock = editor.selectedBlock;

  // Live preview members (RSVP only)
  const previewMembers = useMemo(
    () => [
      {
        id: "p1",
        first_name: "Mario",
        last_name: "Rossi",
        is_child: false,
        allow_plus_one: true,
        rsvp_status: "pending" as const,
        menu_choice: null,
        dietary_restrictions: null,
        plus_one_name: null,
        plus_one_menu: null,
      },
    ],
    []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[92vh] p-0 flex flex-col overflow-hidden rounded-3xl border-border/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.18)] bg-background">
        <DialogHeader className="px-5 py-3 border-b border-border/60 bg-background">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-base">
                Editor a blocchi —{" "}
                {pageKind === "rsvp" ? "Invito RSVP" : "Save The Date"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Riordina, mostra/nascondi e personalizza ogni sezione
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={editor.undo}
                disabled={!editor.canUndo}
                title="Annulla"
                aria-label="Annulla"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={editor.redo}
                disabled={!editor.canRedo}
                title="Ripeti"
                aria-label="Ripeti"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetDefaults}
                title="Ripristina layout predefinito"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Default
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvataggio…
                  </>
                ) : (
                  "Salva layout"
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading || !previewWedding ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-12 gap-0 min-h-0">
            {/* LEFT: block list */}
            <aside className="col-span-3 border-r border-border/60 flex flex-col min-h-0 bg-muted/30">
              <div className="p-4 border-b border-border/60 space-y-3 bg-background/50">
                <Button
                  type="button"
                  variant={settingsOpen ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start font-medium"
                  onClick={() => setSettingsOpen((v) => !v)}
                >
                  <Settings2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  Impostazioni campagna
                </Button>
                {settingsOpen && (
                  <div className="rounded-xl border border-border/60 bg-background p-3 space-y-3 shadow-sm">
                    <div className="space-y-1.5">
                      <Label htmlFor="campaign-deadline" className="text-xs font-medium">
                        Scadenza {pageKind === "rsvp" ? "RSVP" : "Save The Date"}
                      </Label>
                      <Input
                        id="campaign-deadline"
                        type="date"
                        value={deadlineDate}
                        onChange={(e) => setDeadlineDate(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Dopo questa data la pagina pubblica viene chiusa.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="campaign-whatsapp" className="text-xs font-medium">
                        Messaggio WhatsApp
                      </Label>
                      <Textarea
                        id="campaign-whatsapp"
                        value={whatsappTemplate}
                        onChange={(e) => setWhatsappTemplate(e.target.value)}
                        rows={4}
                        placeholder="Ciao {nome}, ecco il link…"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Usa {"{nome}"} e {"{link}"} come segnaposto.
                      </p>
                    </div>
                  </div>
                )}
                <AddBlockMenu pageKind={pageKind} onAdd={editor.addBlock} />
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3">
                  <BlockListEditor
                    blocks={editor.schema.blocks}
                    selectedId={editor.selectedId}
                    onSelect={editor.setSelectedId}
                    onReorder={editor.moveBlock}
                    onToggleVisibility={editor.toggleVisibility}
                    onDuplicate={editor.duplicateBlock}
                    onRemove={editor.removeBlock}
                  />
                </div>
              </ScrollArea>
            </aside>


            {/* CENTER: live preview */}
            <main className="col-span-6 bg-muted/40 flex flex-col min-h-0 relative">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background px-3 py-1.5 rounded-full border border-border/60 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Anteprima Live
                </span>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-8 flex justify-center">
                  {/* Phone bezel */}
                  <div className="relative w-[360px] bg-stone-900 rounded-[2.75rem] p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] ring-1 ring-stone-800">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-stone-900 rounded-b-2xl z-20" />
                    <div className="bg-background rounded-[2rem] overflow-hidden">
                      <PublicInvitationPage
                        schema={{
                          ...editor.schema,
                          blocks: editor.schema.blocks.filter((b) => b.visible),
                        }}
                        pageKind={pageKind}
                        wedding={previewWedding}
                        members={previewMembers}
                        memberData={{}}
                        onMemberDataChange={() => {}}
                        onSubmitRsvp={async () => {
                          toast({ title: "Anteprima", description: "Solo test" });
                        }}
                        submitting={false}
                        isReadOnly={false}
                        deadlineDate={null}
                        guestDisplayName="Mario"
                        coupleName={partnerNames || "Anna & Marco"}
                        weddingLocation={previewWedding.location}
                        ceremonyStartTime={previewWedding.ceremonyStartTime}
                        isPreview={true}
                        onSubmitStd={async () => {
                          toast({ title: "Anteprima", description: "Solo test" });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </main>

            {/* RIGHT: inspector */}
            <aside className="col-span-3 border-l border-border/60 flex flex-col min-h-0 bg-background">
              <div className="px-4 py-3 border-b border-border/60">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Proprietà blocco
                </div>
                <div className="text-sm font-semibold mt-0.5">
                  {selectedBlock
                    ? BLOCK_META[selectedBlock.type].label
                    : "Nessun blocco selezionato"}
                </div>
                {selectedBlock && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {BLOCK_META[selectedBlock.type].description}
                  </div>
                )}
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {selectedBlock ? (
                    <>
                      <BlockInspector
                        block={selectedBlock}
                        weddingId={weddingId}
                        onUpdate={(partial) =>
                          editor.updateBlockConfig(selectedBlock.id, partial)
                        }
                      />
                      <BlockStyleEditor
                        value={selectedBlock.style}
                        onChange={(s) => editor.updateBlockStyle(selectedBlock.id, s)}
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                        <Settings2 className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-foreground/80">
                        Nessun blocco selezionato
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-[220px]">
                        Seleziona un blocco a sinistra per modificarne contenuti e design.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
