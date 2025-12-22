import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Upload, Sparkles, FileText, RefreshCw } from "lucide-react";

interface ImportDropdownProps {
  onSmartImport: () => void;
  onSmartDiff: () => void;
  onDownloadTemplate: () => void;
  onCSVImport: () => void;
  onExportCSV: () => void;
  onExportCateringPDF: () => void;
  hasGuests: boolean;
  hasConfirmedGuests: boolean;
}

export const ImportDropdown = ({
  onSmartImport,
  onSmartDiff,
  onDownloadTemplate,
  onCSVImport,
  onExportCSV,
  onExportCateringPDF,
  hasGuests,
  hasConfirmedGuests,
}: ImportDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Importa Lista
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={onSmartImport}>
          <Sparkles className="w-4 h-4 mr-2 text-primary" />
          <div className="flex-1">
            <div className="font-medium">✨ Importa da Testo Grezzo</div>
            <div className="text-xs text-muted-foreground">AI-powered</div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onSmartDiff} disabled={!hasGuests}>
          <RefreshCw className="w-4 h-4 mr-2 text-primary" />
          <div className="flex-1">
            <div className="font-medium">🔄 Verifica Modifiche</div>
            <div className="text-xs text-muted-foreground">Confronta con lista esterna</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onCSVImport}>
          <Upload className="w-4 h-4 mr-2" />
          <span>⬆️ Importa da file CSV</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onDownloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          📄 Scarica Template CSV
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={onExportCSV} 
          disabled={!hasGuests}
        >
          <Download className="w-4 h-4 mr-2" />
          Esporta CSV
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={onExportCateringPDF} 
          disabled={!hasConfirmedGuests}
        >
          <FileText className="w-4 h-4 mr-2" />
          Report Catering PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
