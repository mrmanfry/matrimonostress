import { Download, FileText, Loader2, LogOut } from "lucide-react";
import { ReactNode, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import BookletPdfDocument from "../pdf/BookletPdfDocument";
import { generateBookletDocx } from "@/lib/bookletDocxExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MassBookletContent } from "@/lib/massBookletSchema";

interface Props {
  content: MassBookletContent;
  partner1: string;
  partner2: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onSaveAndExit: () => void;
  editor: ReactNode;
  preview: ReactNode;
  stepperBar?: ReactNode;
}

/**
 * Split-screen shell for the Mass Booklet v2.
 * Topbar (breadcrumb + save status + export) + 2-column layout
 * (editor on the left, live preview on the right).
 */
export default function BookletShell({
  content,
  partner1,
  partner2,
  saveStatus,
  onSaveAndExit,
  editor,
  preview,
  stepperBar,
}: Props) {
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);

  const handleExportPdf = async () => {
    setExporting("pdf");
    try {
      const blob = await pdf(
        <BookletPdfDocument content={content} partner1={partner1} partner2={partner2} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Libretto_Messa_${partner1 || "sposo"}_${partner2 || "sposa"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF scaricato");
    } catch (e) {
      console.error(e);
      toast.error("Errore nella generazione del PDF");
    } finally {
      setExporting(null);
    }
  };

  const handleExportDocx = async () => {
    setExporting("docx");
    try {
      const blob = await generateBookletDocx(content, partner1, partner2);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Libretto_Messa_${partner1 || "sposo"}_${partner2 || "sposa"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Word scaricato — modificabile liberamente");
    } catch (e) {
      console.error(e);
      toast.error("Errore nella generazione del Word");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-1px)] flex flex-col bg-[hsl(var(--paper-bg))] text-[hsl(var(--paper-ink))] font-inter -m-0">
      {/* ─── Topbar ─── */}
      <header
        className="sticky top-0 z-40 h-14 flex items-center justify-end px-6 border-b border-[hsl(var(--paper-border))] bg-[hsl(var(--paper-surface))]"
      >

        <div className="flex items-center gap-3">
          {/* Save status pill */}
          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--paper-ink-3))]">
            {saveStatus === "saving" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--paper-warn))]" />
                <span>Salvataggio…</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--paper-success))]" />
                <span>Salvato</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--paper-danger))]" />
                <span>Errore di salvataggio</span>
              </>
            )}
          </div>

          {/* Export menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={exporting !== null}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[hsl(var(--paper-brand))] text-white text-xs font-medium hover:bg-[hsl(var(--paper-brand-ink))] transition disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Esporta
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleExportPdf} disabled={exporting !== null}>
                <FileText className="w-3.5 h-3.5 mr-2" /> Scarica PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportDocx} disabled={exporting !== null}>
                <FileText className="w-3.5 h-3.5 mr-2" /> Scarica Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={onSaveAndExit}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[hsl(var(--paper-border))] bg-[hsl(var(--paper-surface))] text-[hsl(var(--paper-ink))] text-xs font-medium hover:bg-[hsl(var(--paper-surface-muted))] transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salva ed esci</span>
          </button>
        </div>
      </header>

      {/* ─── Stepper bar ─── */}
      {stepperBar}

      {/* ─── Split body ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
        {/* Editor (left) */}
        <div className="overflow-auto border-r border-[hsl(var(--paper-border))] bg-[hsl(var(--paper-bg))]">
          {editor}
        </div>
        {/* Live preview (right) */}
        <div className="overflow-hidden hidden lg:block">{preview}</div>
      </div>
    </div>
  );
}
