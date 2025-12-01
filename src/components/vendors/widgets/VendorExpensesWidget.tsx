import { ExpenseItemsManager } from "../ExpenseItemsManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

interface VendorExpensesWidgetProps {
  vendorId: string;
  categoryId?: string | null;
}

export function VendorExpensesWidget({ vendorId, categoryId }: VendorExpensesWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-indigo-600" />
          Gestione Spese e Pagamenti
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ExpenseItemsManager vendorId={vendorId} categoryId={categoryId} />
      </CardContent>
    </Card>
  );
}
