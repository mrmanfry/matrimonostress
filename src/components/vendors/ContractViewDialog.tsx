import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ContractWidgets } from "./ContractWidgets";

interface Vendor {
  id: string;
  name: string;
  vendor_contracts?: Array<{
    id: string;
    analyzed_at: string;
    ai_analysis: any;
    file_path: string;
  }>;
}

interface ContractViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
}

export default function ContractViewDialog({
  open,
  onOpenChange,
  vendor,
}: ContractViewDialogProps) {
  const contract = vendor?.vendor_contracts?.[0];

  if (!contract) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Contratto - {vendor?.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-8rem)]">
          <div className="p-4">
            <ContractWidgets
              contractId={contract.id}
              analysis={contract.ai_analysis}
              filePath={contract.file_path}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
