import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Upload, Sparkles, FileText } from "lucide-react";

interface ImportDropdownProps {
  onSmartImport: () => void;
  onDownloadTemplate: () => void;
  onImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCSV: () => void;
  onExportCateringPDF: () => void;
  hasGuests: boolean;
  hasConfirmedGuests: boolean;
}

export const ImportDropdown = ({
  onSmartImport,
  onDownloadTemplate,
  onImportCSV,
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
        
        <DropdownMenuItem asChild>
          <label className="flex items-center cursor-pointer w-full">
            <Upload className="w-4 h-4 mr-2" />
            <span>⬆️ Importa da file CSV</span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={onImportCSV}
            />
          </label>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onDownloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          📄 Scarica Template CSV
        </DropdownMenuItem>

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
