import { useEffect, useMemo, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { AlertTriangle, FileText, Loader2, Minus, Plus } from "lucide-react";
import BookletPdfDocument from "../pdf/BookletPdfDocument";
import { estimateBookletPages } from "./estimateBookletPages";
import type { MassBookletContent } from "@/lib/massBookletSchema";

interface Props {
  content: MassBookletContent;
  partner1: string;
  partner2: string;
}

/**
 * Live A5 preview of the mass booklet PDF.
 * Re-renders the @react-pdf document with an 800ms debounce
 * and shows it in an iframe at 1:1 fidelity.
 */
export default function BookletLivePreview({ content, partner1, partner2 }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  const cancelTokenRef = useRef(0);

  const pageCount = useMemo(() => estimateBookletPages(content), [content]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const myToken = ++cancelTokenRef.current;
      setGenerating(true);
      try {
        const blob = await pdf(
          <BookletPdfDocument content={content} partner1={partner1} partner2={partner2} />
        ).toBlob();
        if (myToken !== cancelTokenRef.current) return; // stale
        const url = URL.createObjectURL(blob);
        if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = url;
        setPreviewUrl(url);
      } catch (e) {
        console.error("Live preview error:", e);
      } finally {
        if (myToken === cancelTokenRef.current) setGenerating(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content, partner1, partner2]);

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--paper-surface-muted))]">
      {/* Preview header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--paper-border))] bg-[hsl(var(--paper-surface))] px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[hsl(var(--paper-ink-3))]">
          <FileText className="w-3.5 h-3.5" />
          <span>Anteprima live A5</span>
          <span className="inline-flex items-center h-5 px-1.5 rounded bg-[hsl(var(--paper-surface-muted))] text-[hsl(var(--paper-ink-2))] normal-case tracking-normal font-jetbrains-mono">
            {pageCount} pagine
          </span>
          {pageCount % 4 !== 0 && (
            <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded bg-[hsl(var(--paper-warn-tint))] text-[hsl(var(--paper-warn))] normal-case tracking-normal">
              <AlertTriangle className="w-3 h-3" /> Non multiplo di 4
            </span>
          )}
          {generating && (
            <span className="flex items-center gap-1 normal-case tracking-normal text-[hsl(var(--paper-warn))]">
              <Loader2 className="w-3 h-3 animate-spin" /> Aggiorno…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-[hsl(var(--paper-ink-2))] hover:bg-[hsl(var(--paper-surface-muted))] transition"
            aria-label="Riduci zoom"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="font-jetbrains-mono text-xs text-[hsl(var(--paper-ink-2))] min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-[hsl(var(--paper-ink-2))] hover:bg-[hsl(var(--paper-surface-muted))] transition"
            aria-label="Aumenta zoom"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview body */}
      <div className="flex-1 overflow-auto p-6">
        {!previewUrl ? (
          <div className="h-full flex items-center justify-center text-[hsl(var(--paper-ink-3))] text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generazione anteprima…
          </div>
        ) : (
          <div
            className="mx-auto bg-white shadow-lg rounded-md overflow-hidden border border-[hsl(var(--paper-border))]"
            style={{
              width: 595 * zoom,
              height: 800 * zoom,
              maxWidth: "100%",
              transition: "width 0.2s, height 0.2s",
            }}
          >
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
              className="w-full h-full border-0"
              title="Anteprima libretto"
            />
          </div>
        )}
      </div>
    </div>
  );
}
