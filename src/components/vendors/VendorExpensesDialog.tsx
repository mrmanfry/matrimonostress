import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseItemsManager } from "./ExpenseItemsManager";

interface Vendor {
  id: string;
  name: string;
  category_id: string | null;
}

interface VendorExpensesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
}

export function VendorExpensesDialog({
  open,
  onOpenChange,
  vendor,
}: VendorExpensesDialogProps) {
  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Spese di {vendor.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <ExpenseItemsManager vendorId={vendor.id} categoryId={vendor.category_id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
