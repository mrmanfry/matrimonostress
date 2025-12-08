import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { generateChecklistPdf, generateChecklistCsv } from "@/utils/checklistPdfExport";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority?: string;
  assigned_to?: string | null;
  notes?: string | null;
  vendor_id?: string | null;
}

interface Vendor {
  id: string;
  name: string;
}

interface ChecklistExportMenuProps {
  tasks: Task[];
  vendors: Vendor[];
  weddingDate: string;
  partner1Name: string;
  partner2Name: string;
}

export function ChecklistExportMenu({
  tasks,
  vendors,
  weddingDate,
  partner1Name,
  partner2Name,
}: ChecklistExportMenuProps) {
  const { toast } = useToast();

  const handleExportPdf = (includeCompleted: boolean) => {
    try {
      generateChecklistPdf({
        tasks,
        vendors,
        weddingDate,
        partner1Name,
        partner2Name,
        includeCompleted,
      });
      toast({
        title: "PDF generato!",
        description: "Il file è stato scaricato",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile generare il PDF",
        variant: "destructive",
      });
    }
  };

  const handleExportCsv = () => {
    try {
      generateChecklistCsv({
        tasks,
        vendors,
        partner1Name,
        partner2Name,
      });
      toast({
        title: "CSV generato!",
        description: "Il file è stato scaricato",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile generare il CSV",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Esporta
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExportPdf(true)}>
          <FileText className="w-4 h-4 mr-2" />
          PDF Completo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportPdf(false)}>
          <FileText className="w-4 h-4 mr-2" />
          PDF Solo In Sospeso
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCsv}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Excel (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
