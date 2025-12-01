import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { calculateExpenseAmount, resolveGuestCounts } from "@/lib/expenseCalculations";

interface UnallocatedExpensesWidgetProps {
  weddingId: string;
  globalMode: 'planned' | 'actual';
}

interface UnallocatedExpense {
  id: string;
  description: string;
  vendor?: { id: string; name: string };
  totalCost: number;
  scheduled: number;
  missing: number;
  expense_type: 'fixed' | 'variable' | 'mixed';
}

export function UnallocatedExpensesWidget({ weddingId, globalMode }: UnallocatedExpensesWidgetProps) {
  const navigate = useNavigate();

  const { data: unallocatedItems, isLoading } = useQuery({
    queryKey: ["unallocated-expenses", weddingId, globalMode],
    queryFn: async () => {
      // 1. Fetch wedding settings per i target globali
      const { data: wedding, error: weddingError } = await supabase
        .from("weddings")
        .select("target_adults, target_children, target_staff")
        .eq("id", weddingId)
        .single();

      if (weddingError) throw weddingError;

      const globalTargets = {
        adults: wedding?.target_adults || 100,
        children: wedding?.target_children || 0,
        staff: wedding?.target_staff || 0,
      };

      // 2. Fetch actual guest counts per calcolo "actual"
      const { data: guestCounts, error: guestsError } = await supabase
        .from("guests")
        .select("is_child, is_staff, rsvp_status")
        .eq("wedding_id", weddingId);

      if (guestsError) throw guestsError;

      const actualCounts = {
        adults: guestCounts?.filter(g => !g.is_child && !g.is_staff && g.rsvp_status === 'confirmed').length || 0,
        children: guestCounts?.filter(g => g.is_child && g.rsvp_status === 'confirmed').length || 0,
        staff: guestCounts?.filter(g => g.is_staff).length || 0,
      };

      // 3. Fetch expense_items con vendor, line_items e payments
      const { data: expenses, error: expensesError } = await supabase
        .from("expense_items")
        .select(`
          id,
          description,
          expense_type,
          fixed_amount,
          planned_adults,
          planned_children,
          planned_staff,
          tax_rate,
          amount_is_tax_inclusive,
          vendors (id, name),
          expense_line_items (*),
          payments (amount)
        `)
        .eq("wedding_id", weddingId);

      if (expensesError) throw expensesError;

      // 4. Calcola missing per ogni spesa
      const items: UnallocatedExpense[] = [];

      for (const expense of expenses || []) {
        // Risolvi guest counts (locale override o globale)
        const plannedCounts = resolveGuestCounts(
          {
            planned_adults: expense.planned_adults,
            planned_children: expense.planned_children,
            planned_staff: expense.planned_staff,
          },
          globalTargets
        );

        const guestCounts = {
          planned: plannedCounts,
          actual: actualCounts,
        };

        // Calcola total cost usando la libreria centralizzata
        const totalCost = calculateExpenseAmount(
          expense as any,
          (expense.expense_line_items || []).map(line => ({
            ...line,
            quantity_type: line.quantity_type as 'fixed' | 'adults' | 'children' | 'total_guests' | 'staff',
            quantity_range: (line.quantity_range || 'all') as 'all' | 'up_to' | 'over',
          })),
          globalMode,
          guestCounts
        );

        // Somma pagamenti schedulati
        const scheduled = expense.payments?.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        ) || 0;

        // Calcola missing (tolleranza 1€ per arrotondamenti)
        const missing = totalCost - scheduled;

        if (missing > 1) {
          items.push({
            id: expense.id,
            description: expense.description,
            vendor: expense.vendors as any,
            totalCost,
            scheduled,
            missing,
            expense_type: expense.expense_type as any || 'variable',
          });
        }
      }

      return items;
    },
  });

  if (isLoading || !unallocatedItems?.length) return null;

  const totalMissing = unallocatedItems.reduce((acc, item) => acc + item.missing, 0);

  return (
    <Card className="border-amber-200 bg-amber-50 overflow-hidden">
      <CardHeader className="pb-3 border-b border-amber-100 bg-amber-100/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-lg font-bold">
              Spese da Pianificare
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(totalMissing)} in sospeso
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-amber-700 mb-4">
          Hai <strong>{unallocatedItems.length} {unallocatedItems.length === 1 ? 'spesa' : 'spese'}</strong> con costi definiti ma senza una data di pagamento completa. 
          Questi importi non compaiono nel grafico del cash flow mensile.
        </p>

        <Accordion type="single" collapsible className="bg-white rounded-lg border border-amber-100 px-4">
          {unallocatedItems.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex flex-1 justify-between items-center pr-4">
                  <div className="flex flex-col text-left">
                    <span className="font-medium text-gray-900">{item.description}</span>
                    <span className="text-xs text-gray-500">{item.vendor?.name || "Nessun fornitore"}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-600">
                      - {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(item.missing)}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      su {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(item.totalCost)} totali
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="flex justify-end gap-3 items-center bg-gray-50 p-3 rounded-md">
                  <span className="text-xs text-gray-500 italic">
                    Definisci quando pagherai questo importo per vederlo in Tesoreria.
                  </span>
                  <Button 
                    size="sm" 
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                    onClick={() => {
                      if (item.vendor?.id) {
                        navigate(`/app/vendors/${item.vendor.id}?tab=expenses`);
                      } else {
                        navigate(`/app/vendors`);
                      }
                    }}
                  >
                    <CalendarClock className="w-3 h-3" />
                    Pianifica Pagamento
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
