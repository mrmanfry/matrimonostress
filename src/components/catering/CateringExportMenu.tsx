import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { generateCateringReport } from "@/utils/pdfHelpers";
import type { CateringGuestRow } from "./CateringGuestTable";

interface CateringExportMenuProps {
  guests: CateringGuestRow[];
}

export const CateringExportMenu = ({ guests }: CateringExportMenuProps) => {
  const confirmed = guests.filter(g => g.rsvp_status === "confirmed");

  const exportCSV = () => {
    if (confirmed.length === 0) {
      toast.error("Nessun ospite confermato da esportare");
      return;
    }

    const typeLabel = (g: { is_child: boolean; child_age_group?: string | null }) => {
      if (!g.is_child) return "Adulto";
      if (g.child_age_group === "infant") return "<3 anni";
      return "Bambino";
    };

    // Header
    const headers = ["Nome", "Cognome", "Nucleo", "Tavolo", "Dieta", "Allergie/Intolleranze", "Note", "Tipo"];
    const rows = confirmed.map(g => [
      g.first_name,
      g.last_name,
      g.party_name || "",
      g.table_name || "",
      g.menu_choice || "",
      g.dietary_restrictions || "",
      g.notes || "",
      typeLabel(g),
    ]);

    // Aggregate section
    const veg = confirmed.filter(g => g.menu_choice === "vegetariano").length;
    const vgn = confirmed.filter(g => g.menu_choice === "vegano").length;
    const cel = confirmed.filter(g => g.menu_choice === "celiaco").length;
    const allerg = confirmed.filter(g => g.dietary_restrictions?.trim()).length;
    const adults = confirmed.filter(g => !g.is_child).length;
    const kids = confirmed.filter(g => g.is_child && g.child_age_group !== "infant").length;
    const infants = confirmed.filter(g => g.is_child && g.child_age_group === "infant").length;

    // Build by-table summary
    const tableMap = new Map<string, number>();
    confirmed.forEach(g => {
      const t = g.table_name || "Non assegnati";
      tableMap.set(t, (tableMap.get(t) || 0) + 1);
    });

    let csv = headers.join(",") + "\n";
    csv += rows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    csv += "\n\n";
    csv += "RIEPILOGO\n";
    csv += `Totale Confermati,${confirmed.length}\n`;
    csv += `Adulti,${adults}\n`;
    csv += `Bambini (menu bimbi),${kids}\n`;
    csv += `Sotto i 3 anni (no coperto),${infants}\n`;
    csv += `Vegetariani,${veg}\n`;
    csv += `Vegani,${vgn}\n`;
    csv += `Celiaci,${cel}\n`;
    csv += `Con Allergie,${allerg}\n`;
    csv += "\nPER TAVOLO\n";
    csv += "Tavolo,Ospiti\n";
    tableMap.forEach((count, name) => {
      csv += `"${name}",${count}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-catering-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV esportato");
  };

  const exportPDF = () => {
    if (confirmed.length === 0) {
      toast.error("Nessun ospite confermato da esportare");
      return;
    }
    generateCateringReport(confirmed.map(g => ({
      first_name: g.first_name,
      last_name: g.last_name,
      menu_choice: g.menu_choice,
      dietary_restrictions: g.dietary_restrictions,
      notes: g.notes,
      adults_count: g.is_child ? 0 : 1,
      children_count: g.is_child ? 1 : 0,
      is_child: g.is_child,
      table_name: g.table_name || undefined,
    })));
    toast.success("PDF generato");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" /> Esporta
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Esporta CSV (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPDF}>
          <FileText className="w-4 h-4 mr-2" /> Esporta PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
