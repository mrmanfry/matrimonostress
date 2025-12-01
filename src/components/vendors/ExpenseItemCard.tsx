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
      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{item.description}</h4>
              <span className="text-lg font-semibold text-primary">
                {formatCurrency(itemTotal)}
              </span>
            </div>
            {payments.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {payments.length} {payments.length === 1 ? 'rata' : 'rate'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {payments.length > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
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
              className="ml-4 pl-4 border-l-2 flex items-center justify-between text-sm"
            >
              <div>
                <span className="font-medium">{payment.description}</span>
                {payment.amount_type === 'percentage' && payment.percentage_value && (
                  <span className="text-muted-foreground ml-2">
                    ({payment.percentage_value}%)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {payment.amount_type === 'fixed' && (
                  <span className="font-semibold">
                    {formatCurrency(Number(payment.amount))}
                  </span>
                )}
                <span className="text-muted-foreground">
                  📅 {formatDate(payment.due_date)}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
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
