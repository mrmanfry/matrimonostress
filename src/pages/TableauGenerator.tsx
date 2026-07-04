import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Heart, Download, FileImage, ArrowLeft, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { TableauSetupWizard } from "@/components/tableau/TableauSetupWizard";
import { TableauCanvas } from "@/components/tableau/TableauCanvas";
import { TableauStylePanel } from "@/components/tableau/TableauStylePanel";
import { TableauStagingArea } from "@/components/tableau/TableauStagingArea";
import { useTableauLayout, DEFAULT_STYLE, type TableauLayoutRow } from "@/hooks/useTableauLayout";
import {
  generateTableauPDF,
  generateTableauPNG,
  hashBlocksContent,
  type TableauRenderBlock,
  type TableauStyle,
  type TableauBlockPosition,
} from "@/lib/tableauGeneratorEngine";

interface Table { id: string; name: string; }
interface Assignment { id: string; table_id: string; guest_id: string; }
interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  party_id: string | null;
  allow_plus_one?: boolean;
  plus_one_name?: string | null;
  plus_one_of_guest_id?: string | null;
}
interface Party { id: string; party_name: string; }

export default function TableauGenerator() {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const weddingId = authState.weddingId ?? null;

  const { layout, loading, saving, savedAt, createLayout, patch, patchImmediate } = useTableauLayout(weddingId);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Data fetch
  useEffect(() => {
    if (!weddingId) return;
    (async () => {
      setDataLoading(true);
      const [t, gAll, p] = await Promise.all([
        supabase.from("tables").select("id, name").eq("wedding_id", weddingId),
        supabase.from("guests").select("*").eq("wedding_id", weddingId).or("rsvp_status.eq.confirmed,rsvp_status.eq.Confermato"),
        supabase.from("invite_parties").select("id, party_name").eq("wedding_id", weddingId),
      ]);
      const tableIds = (t.data ?? []).map((x: any) => x.id);
      const a = tableIds.length
        ? await supabase.from("table_assignments").select("id, table_id, guest_id").in("table_id", tableIds)
        : { data: [] };
      setTables((t.data ?? []) as Table[]);
      setAssignments((a.data ?? []) as Assignment[]);
      setGuests((gAll.data ?? []) as Guest[]);
      setParties((p.data ?? []) as Party[]);
      setDataLoading(false);
    })();
  }, [weddingId]);

  // Signed URL for background
  useEffect(() => {
    if (!layout?.background_path) { setBgUrl(null); return; }
    (async () => {
      const { data } = await supabase.storage.from("tableau-backgrounds").createSignedUrl(layout.background_path!, 3600);
      setBgUrl(data?.signedUrl ?? null);
    })();
  }, [layout?.background_path]);

  // Show wizard if no layout
  useEffect(() => {
    if (!loading && !layout) setWizardOpen(true);
  }, [loading, layout]);

  const style: TableauStyle = useMemo(() => ({
    ...DEFAULT_STYLE,
    ...(layout?.style ?? {}),
  }), [layout?.style]);

  // Build guest lists per table + virtual +1s
  const virtualPlusOnes = useMemo<Guest[]>(() => {
    const promoted = new Set(guests.filter((g) => g.plus_one_of_guest_id).map((g) => g.plus_one_of_guest_id as string));
    return guests
      .filter((g) => g.allow_plus_one && g.plus_one_name?.trim() && !promoted.has(g.id))
      .map((g) => {
        const parts = g.plus_one_name!.trim().split(/\s+/);
        return {
          id: `plusone_${g.id}`,
          first_name: parts[0],
          last_name: parts.slice(1).join(" ") || g.last_name,
          rsvp_status: g.rsvp_status,
          party_id: g.party_id,
        } as Guest;
      });
  }, [guests]);

  const allGuestsForTables = useMemo(() => [...guests, ...virtualPlusOnes], [guests, virtualPlusOnes]);
  const guestsById = useMemo(() => new Map(allGuestsForTables.map((g) => [g.id, g])), [allGuestsForTables]);
  const partyName = useMemo(() => new Map(parties.map((p) => [p.id, p.party_name])), [parties]);

  // Extend assignments with virtual +1s: bind them to host's table
  const assignmentsWithVirtuals = useMemo(() => {
    const list = [...assignments];
    for (const p1 of virtualPlusOnes) {
      const hostId = p1.id.replace("plusone_", "");
      const hostAssign = assignments.find((a) => a.guest_id === hostId);
      if (hostAssign) list.push({ id: `v-${p1.id}`, table_id: hostAssign.table_id, guest_id: p1.id });
    }
    return list;
  }, [assignments, virtualPlusOnes]);

  // Build render blocks
  const { placedBlocks, stagedBlocks, contentHash } = useMemo(() => {
    const savedPositions = (layout?.blocks ?? {}) as Record<string, TableauBlockPosition>;
    const placed: TableauRenderBlock[] = [];
    const staged: TableauRenderBlock[] = [];
    for (const t of tables) {
      const rows = assignmentsWithVirtuals.filter((a) => a.table_id === t.id);
      const gs = rows.map((r) => guestsById.get(r.guest_id)).filter(Boolean) as Guest[];
      if (gs.length === 0) continue;

      let lines: string[] = [];
      if (style.displayMode === "first") {
        lines = gs.map((g) => g.first_name);
      } else if (style.displayMode === "family") {
        const groups = new Map<string, Guest[]>();
        const singles: Guest[] = [];
        for (const g of gs) {
          const pn = g.party_id ? partyName.get(g.party_id) : null;
          if (pn) {
            if (!groups.has(pn)) groups.set(pn, []);
            groups.get(pn)!.push(g);
          } else {
            singles.push(g);
          }
        }
        for (const [name, arr] of groups) lines.push(`${name} (${arr.length})`);
        lines.push(...singles.map((g) => `${g.first_name} ${g.last_name}`.trim()));
      } else {
        lines = gs.map((g) => `${g.first_name} ${g.last_name}`.trim());
      }

      const block: TableauRenderBlock = {
        tableId: t.id,
        title: t.name,
        lines,
        position: savedPositions[t.id] ?? { x_pct: 40, y_pct: 40, w_pct: 20 },
      };
      if (savedPositions[t.id]) placed.push(block); else staged.push(block);
    }
    const hash = hashBlocksContent([...placed, ...staged]);
    return { placedBlocks: placed, stagedBlocks: staged, contentHash: hash };
  }, [tables, assignmentsWithVirtuals, guestsById, layout?.blocks, style.displayMode, partyName]);

  // Alert about new tables to place
  const [alerted, setAlerted] = useState(false);
  useEffect(() => {
    if (!alerted && !loading && !dataLoading && layout && stagedBlocks.length > 0) {
      toast({ title: "Nuovi tavoli da posizionare", description: `Hai ${stagedBlocks.length} tavolo/i in area di staging.` });
      setAlerted(true);
    }
  }, [alerted, loading, dataLoading, layout, stagedBlocks.length, toast]);

  const updateStyle = (s: TableauStyle) => patch({ style: { ...(layout?.style ?? {}), ...s } });

  const moveBlock = (tableId: string, pos: TableauBlockPosition) => {
    patch({ blocks: { ...(layout?.blocks ?? {}), [tableId]: pos } });
  };
  const resizeBlock = (tableId: string, wPct: number) => {
    const cur = (layout?.blocks ?? {})[tableId] ?? { x_pct: 40, y_pct: 40 };
    patch({ blocks: { ...(layout?.blocks ?? {}), [tableId]: { ...cur, w_pct: wPct } } });
  };
  const placeStaged = (tableId: string) => {
    patch({ blocks: { ...(layout?.blocks ?? {}), [tableId]: { x_pct: 40, y_pct: 40, w_pct: 20 } } });
  };

  const doExport = async (kind: "pdf" | "png") => {
    if (!layout || !bgUrl) return;
    setExporting(true);
    try {
      const allBlocks = [...placedBlocks, ...stagedBlocks];
      const input = {
        backgroundUrl: bgUrl,
        widthCm: Number(layout.width_cm),
        heightCm: Number(layout.height_cm),
        style,
        blocks: allBlocks,
      };
      const blob = kind === "pdf" ? await generateTableauPDF(input) : await generateTableauPNG(input);
      const ext = kind === "pdf" ? "pdf" : "png";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tableau-de-mariage.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      await patchImmediate({
        status: "frozen",
        style: { ...(layout.style ?? {}), lastExportHash: contentHash },
      } as Partial<TableauLayoutRow>);
      toast({ title: "Esportato", description: `File ${ext.toUpperCase()} pronto per la tipografia.` });
    } catch (e: any) {
      toast({ title: "Errore export", description: e?.message ?? "Riprova", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const backToDraft = () => patchImmediate({ status: "draft" });

  if (loading || dataLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Heart className="w-12 h-12 text-accent fill-accent animate-pulse" /></div>;
  }

  if (!weddingId) return null;

  if (!layout) {
    return (
      <>
        <TableauSetupWizard
          open={wizardOpen}
          weddingId={weddingId}
          onOpenChange={(o) => { setWizardOpen(o); if (!o) navigate("/app/tables"); }}
          onCreated={async (payload) => {
            await createLayout({ ...payload, style: DEFAULT_STYLE });
            setWizardOpen(false);
          }}
        />
      </>
    );
  }

  const isFrozen = layout.status === "frozen";
  const driftDetected = isFrozen && layout.style?.lastExportHash && layout.style.lastExportHash !== contentHash;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/tables")} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Tavoli
          </Button>
          <h1 className="font-semibold">Generatore Tableau</h1>
          <span className="text-xs text-muted-foreground">{Number(layout.width_cm)}×{Number(layout.height_cm)} cm</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Salvataggio…</span>}
          {!saving && savedAt && <span className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Salvato</span>}
          <Button variant="outline" size="sm" onClick={() => doExport("png")} disabled={exporting || !bgUrl} className="gap-1">
            <FileImage className="w-4 h-4" /> PNG 300dpi
          </Button>
          <Button size="sm" onClick={() => doExport("pdf")} disabled={exporting || !bgUrl} className="gap-1">
            <Download className="w-4 h-4" /> Esporta per la Stampa
          </Button>
        </div>
      </div>

      {/* Banner status */}
      {isFrozen && (
        <div className={`px-4 py-2 text-sm flex items-center justify-between gap-2 ${driftDetected ? "bg-amber-50 border-b border-amber-200 text-amber-900" : "bg-muted/50 border-b"}`}>
          <div className="flex items-center gap-2">
            {driftDetected && <AlertTriangle className="w-4 h-4" />}
            <span>
              {driftDetected
                ? "Il contenuto è cambiato dopo l'esportazione: la stampa non è aggiornata."
                : "Tableau esportato — le modifiche successive agli ospiti/tavoli non sono riflesse nella stampa."}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={backToDraft}>Riporta in bozza</Button>
        </div>
      )}

      {/* Mobile notice */}
      {isMobile ? (
        <div className="p-4 flex-1 flex flex-col">
          <div className="rounded-md border p-3 bg-muted/40 text-sm mb-3">
            L'editing del tableau richiede desktop. Qui sotto vedi un'anteprima in sola lettura.
          </div>
          <div className="flex-1 min-h-0">
            {bgUrl && (
              <TableauCanvas
                backgroundUrl={bgUrl}
                widthCm={Number(layout.width_cm)}
                heightCm={Number(layout.height_cm)}
                style={style}
                blocks={placedBlocks}
                onBlockMove={() => {}}
                onBlockWidth={() => {}}
                readOnly
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Staging */}
          <aside className="w-60 border-r overflow-y-auto shrink-0">
            <TableauStagingArea staged={stagedBlocks} onPlace={placeStaged} />
          </aside>

          {/* Canvas */}
          <main className="flex-1 min-w-0 p-4">
            {bgUrl ? (
              <TableauCanvas
                backgroundUrl={bgUrl}
                widthCm={Number(layout.width_cm)}
                heightCm={Number(layout.height_cm)}
                style={style}
                blocks={placedBlocks}
                onBlockMove={moveBlock}
                onBlockWidth={resizeBlock}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">Caricamento sfondo…</div>
            )}
          </main>

          {/* Style */}
          <aside className="w-72 border-l overflow-y-auto shrink-0">
            <TableauStylePanel style={style} onChange={updateStyle} />
          </aside>
        </div>
      )}
    </div>
  );
}
