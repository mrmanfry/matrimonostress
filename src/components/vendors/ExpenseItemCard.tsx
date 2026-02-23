import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ExpenseItem {
  id: string;
  description: string;
  category_id: string | null;
  vendor_id: string;
  total_amount: number | null;
  amount_is_tax_inclusive: boolean;
  tax_rate: number | null;
  calculation_mode: 'planned' | 'expected' | 'confirmed';
  planned_adults: number;
  planned_children: number;
  planned_staff: number;
}

interface Payment {
  id: string;
  description: string;
  amount: number;
  amount_type: 'fixed' | 'percentage';
  percentage_value: number | null;
  due_date: string;
  status: 'Da Pagare' | 'Pagato';
  tax_rate: number | null;
  tax_inclusive: boolean;
}

interface ExpenseItemCardProps {
  item: ExpenseItem;
  payments: Payment[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  calculateTotal: (item: ExpenseItem) => Promise<number>;
}

export function ExpenseItemCard({
  item,
  payments,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  calculateTotal,
}: ExpenseItemCardProps) {
  const [itemTotal, setItemTotal] = useState(0);

  useEffect(() => {
    calculateTotal(item).then(setItemTotal);
  }, [item, calculateTotal]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="border rounded-lg p-3 md:p-4 space-y-2 overflow-hidden">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
              <h4 className="font-medium text-sm md:text-base truncate">{item.description}</h4>
              <span className="text-base md:text-lg font-semibold text-primary whitespace-nowrap">
                {formatCurrency(itemTotal)}
              </span>
            </div>
            {payments.length > 0 && (
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                {payments.length} {payments.length === 1 ? 'rata' : 'rate'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 md:gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit}>
              <Edit className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
            {payments.length > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>

        <CollapsibleContent className="space-y-2 pt-2">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="ml-2 md:ml-4 pl-3 md:pl-4 border-l-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 text-xs md:text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium">{payment.description}</span>
                {payment.amount_type === 'percentage' && payment.percentage_value && (
                  <span className="text-muted-foreground ml-1">
                    ({payment.percentage_value}%)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 md:gap-3 flex-wrap shrink-0">
                {payment.amount_type === 'fixed' && (
                  <span className="font-semibold whitespace-nowrap">
                    {formatCurrency(Number(payment.amount))}
                  </span>
                )}
                <span className="text-muted-foreground whitespace-nowrap">
                  📅 {formatDate(payment.due_date)}
                </span>
                <span
                  className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium whitespace-nowrap ${
                    payment.status === 'Pagato'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                  }`}
                >
                  {payment.status}
                </span>
              </div>
            </div>
          ))}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
