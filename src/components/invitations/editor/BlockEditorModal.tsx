import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Undo2, Redo2, Smartphone, RotateCcw } from "lucide-react";
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
      const updated = { ...cfg, pages };

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
      <DialogContent className="max-w-[95vw] w-full h-[92vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle>
                Editor a blocchi —{" "}
                {pageKind === "rsvp" ? "Invito RSVP" : "Save The Date"}
              </DialogTitle>
              <DialogDescription>
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
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={editor.redo}
                disabled={!editor.canRedo}
                title="Ripeti"
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
              <Button onClick={handleSave} disabled={saving || loading}>
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
            <aside className="col-span-3 border-r flex flex-col min-h-0">
              <div className="p-3 border-b">
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
            <main className="col-span-6 bg-muted/30 flex flex-col min-h-0">
              <div className="px-3 py-2 border-b flex items-center gap-2 text-xs text-muted-foreground">
                <Smartphone className="w-3.5 h-3.5" />
                Anteprima live
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6 flex justify-center">
                  <div className="w-[380px] bg-background border rounded-2xl overflow-hidden shadow-xl">
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
              </ScrollArea>
            </main>

            {/* RIGHT: inspector */}
            <aside className="col-span-3 border-l flex flex-col min-h-0">
              <div className="px-3 py-2 border-b">
                <div className="text-sm font-semibold">
                  {selectedBlock
                    ? BLOCK_META[selectedBlock.type].label
                    : "Nessun blocco selezionato"}
                </div>
                {selectedBlock && (
                  <div className="text-xs text-muted-foreground">
                    {BLOCK_META[selectedBlock.type].description}
                  </div>
                )}
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
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
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Seleziona un blocco a sinistra per modificarlo.
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
