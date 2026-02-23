import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { calculateExpenseAmount, resolveGuestCounts, ExpenseItem, ExpenseLineItem, GuestCounts } from "@/lib/expenseCalculations";
import { calculateExpectedCounts, calculateTotalVendorStaff } from "@/lib/expectedCalculator";
import { Button } from "@/components/ui/button";
import { AddBudgetItemDialog } from "./AddBudgetItemDialog";
import { AssignVendorDialog } from "./AssignVendorDialog";
import { isConfirmed } from "@/lib/rsvpHelpers";

interface BudgetRowData {
  id: string;
  description: string;
  vendorName: string | null;
  categoryName: string;
  categoryId: string;
  isPlaceholder: boolean;
  expenseType: "fixed" | "variable" | "mixed";
  isVariableExpense: boolean;
  actual: number;
  paid: number;
  remaining: number;
}

interface CategoryGroup {
  categoryName: string;
  categoryId: string;
  rows: BudgetRowData[];
  totalActual: number;
  totalPaid: number;
  totalRemaining: number;
}

interface BudgetSpreadsheetProps {
  globalMode: 'planned' | 'expected' | 'confirmed';
}

export function BudgetSpreadsheet({ globalMode }: BudgetSpreadsheetProps) {
  const { authState } = useAuth();
  const queryClient = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; description: string } | null>(null);
  const [guestBreakdown, setGuestBreakdown] = useState({ confirmed: 0, pending: 0, declined: 0 });

  const weddingId = authState.status === "authenticated" ? authState.weddingId : null;

  // Fetch tutti i dati necessari
  const { data: budgetData, isLoading } = useQuery({
    queryKey: ["budget-spreadsheet", weddingId],
    enabled: !!weddingId && authState.status === "authenticated",
    queryFn: async () => {
      if (!weddingId) throw new Error("No wedding ID");

      // 1. Fetch wedding per calculation_mode e target ospiti
      const { data: wedding, error: weddingError } = await supabase
        .from("weddings")
        .select("calculation_mode, target_adults, target_children, target_staff")
        .eq("id", weddingId)
        .single();

      if (weddingError) throw weddingError;

      // 2. Fetch expense_items con relazioni
      const { data: expenseItems, error: expenseError } = await supabase
        .from("expense_items")
        .select(`
          id,
          description,
          estimated_amount,
          fixed_amount,
          expense_type,
          planned_adults,
          planned_children,
          planned_staff,
          tax_rate,
          amount_is_tax_inclusive,
          vendor_id,
          category_id,
          vendors(name),
          expense_categories(name)
        `)
        .eq("wedding_id", weddingId);

      if (expenseError) throw expenseError;

      // 3. Fetch expense_line_items
      const itemIds = (expenseItems || []).map(item => item.id);
      let lineItems: any[] = [];
      if (itemIds.length > 0) {
        const { data, error } = await supabase
          .from("expense_line_items")
          .select("*")
          .in("expense_item_id", itemIds)
          .order("order_index");
        if (error) throw error;
        lineItems = data || [];
      }

      // 4. Fetch payments
      let payments: any[] = [];
      if (itemIds.length > 0) {
        const { data, error } = await supabase
          .from("payments")
          .select("expense_item_id, amount, status, tax_rate, tax_inclusive")
          .in("expense_item_id", itemIds);
        if (error) throw error;
        payments = data || [];
      }

      // 5. Fetch guests con TUTTI i campi necessari per expectedCalculator
      const { data: guests, error: guestsError } = await supabase
        .from("guests")
        .select("id, is_child, is_staff, rsvp_status, is_couple_member, save_the_date_sent_at, std_response, party_id, phone, allow_plus_one, plus_one_name")
        .eq("wedding_id", weddingId);

      if (guestsError) throw guestsError;

      // 6. Fetch vendors per staff_meals_count
      const { data: vendors, error: vendorsError } = await supabase
        .from("vendors")
        .select("staff_meals_count")
        .eq("wedding_id", weddingId);

      if (vendorsError) throw vendorsError;

      const allGuests = guests || [];
      const vendorStaffTotal = calculateTotalVendorStaff(vendors || []);

      // Filtra non-couple, non-staff per il calcolo expected
      const invitableGuests = allGuests.filter(g => !g.is_couple_member && !g.is_staff);

      // Calcola conteggi expected usando la formula canonica
      const expectedResult = calculateExpectedCounts(invitableGuests, allGuests, vendorStaffTotal);

      // Confirmed: RSVP confermato
      const confirmedAdults = allGuests.filter(g => !g.is_child && !g.is_staff && !g.is_couple_member && isConfirmed(g.rsvp_status)).length;
      const confirmedChildren = allGuests.filter(g => g.is_child && isConfirmed(g.rsvp_status)).length;
      const confirmedStaff = allGuests.filter(g => g.is_staff && isConfirmed(g.rsvp_status)).length;

      // Breakdown per UI
      const confirmedTotal = allGuests.filter(g => isConfirmed(g.rsvp_status)).length;
      const declinedTotal = allGuests.filter(g => g.rsvp_status === 'declined' || g.rsvp_status === 'Rifiutato').length;
      const pendingTotal = allGuests.length - confirmedTotal - declinedTotal;

      return {
        wedding,
        expenseItems: expenseItems || [],
        lineItems,
        payments: payments || [],
        guestBreakdown: { confirmed: confirmedTotal, pending: pendingTotal, declined: declinedTotal },
        guestCounts: {
          planned: {
            adults: wedding.target_adults || 100,
            children: wedding.target_children || 0,
            staff: wedding.target_staff || 0
          },
          expected: {
            adults: expectedResult.adults,
            children: expectedResult.children,
            staff: expectedResult.staff
          },
          confirmed: {
            adults: confirmedAdults,
            children: confirmedChildren,
            staff: confirmedStaff
          }
        }
      };
    }
  });

  // Sync breakdown with DB data
  useEffect(() => {
    if (budgetData?.guestBreakdown) {
      setGuestBreakdown(budgetData.guestBreakdown);
    }
  }, [budgetData]);

  // (updateEstimate rimossa - non più necessaria con colonna unificata)

  // Calcola i dati delle righe
  const groupedData = useMemo(() => {
    if (!budgetData) return [];

    const calculationMode = globalMode;
    const groups = new Map<string, CategoryGroup>();

    budgetData.expenseItems.forEach((item: any) => {
      // Risolvi i guest counts con logica di ereditarietà (NULL -> usa globale)
      const resolvedCounts = resolveGuestCounts(
        {
          planned_adults: item.planned_adults,
          planned_children: item.planned_children,
          planned_staff: item.planned_staff
        },
        budgetData.guestCounts.planned
      );

      // Calcola importo effettivo usando la libreria centralizzata
      const itemLineItems = budgetData.lineItems.filter((li: any) => li.expense_item_id === item.id);
      const actualAmount = calculateExpenseAmount(
        {
          id: item.id,
          expense_type: item.expense_type || 'fixed',
          fixed_amount: item.fixed_amount,
          planned_adults: resolvedCounts.adults,
          planned_children: resolvedCounts.children,
          planned_staff: resolvedCounts.staff,
          tax_rate: item.tax_rate,
          amount_is_tax_inclusive: item.amount_is_tax_inclusive ?? true
        } as ExpenseItem,
        itemLineItems as ExpenseLineItem[],
        calculationMode,
        budgetData.guestCounts
      );

      // Calcola importo pagato
      const itemPayments = budgetData.payments.filter((p: any) => p.expense_item_id === item.id && p.status === "Pagato");
      const paidAmount = itemPayments.reduce((sum: number, p: any) => {
        const baseAmount = Number(p.amount || 0);
        return sum + (p.tax_inclusive ? baseAmount : baseAmount * (1 + (p.tax_rate || 0) / 100));
      }, 0);

      const categoryName = item.expense_categories?.name || "Senza Categoria";
      const categoryId = item.category_id || "uncategorized";

      const isPlaceholder = !item.vendor_id;
      // Una spesa è variabile solo se ha righe con quantity_type diverso da 'fixed'
      const hasVariableLineItems = itemLineItems.some((li: any) => li.quantity_type !== 'fixed');
      const isVariable = hasVariableLineItems;
      
      const row: BudgetRowData = {
        id: item.id,
        description: item.description,
        vendorName: item.vendors?.name || null,
        categoryName,
        categoryId,
        isPlaceholder,
        expenseType: (item.expense_type || "fixed") as "fixed" | "variable" | "mixed",
        isVariableExpense: isVariable,
        actual: actualAmount,
        paid: paidAmount,
        remaining: Math.max(0, actualAmount - paidAmount)
      };

      if (!groups.has(categoryId)) {
        groups.set(categoryId, {
          categoryName,
          categoryId,
          rows: [],
          totalActual: 0,
          totalPaid: 0,
          totalRemaining: 0
        });
      }

      const group = groups.get(categoryId)!;
      group.rows.push(row);
      group.totalActual += row.actual;
      group.totalPaid += row.paid;
      group.totalRemaining += row.remaining;
    });

    return Array.from(groups.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [budgetData, globalMode]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  // Calculate total guests for current mode
  const totalCurrentModeGuests = budgetData?.guestCounts?.[globalMode] 
    ? budgetData.guestCounts[globalMode].adults + 
      budgetData.guestCounts[globalMode].children + 
      budgetData.guestCounts[globalMode].staff
    : 0;

  // Get guest count label for headers
  const getGuestCountLabel = () => {
    if (!budgetData?.guestCounts) return '';
    const counts = budgetData.guestCounts[globalMode];
    const total = counts.adults + counts.children + counts.staff;
    
    switch (globalMode) {
      case 'planned': return `(su ${total} pianificati)`;
      case 'expected': return `(su ${total} previsti)`;
      case 'confirmed': return `(su ${total} confermati)`;
    }
  };

  // Calculate grand totals across all categories
  const grandTotals = useMemo(() => {
    return groupedData.reduce((acc, category) => ({
      actual: acc.actual + category.totalActual,
      paid: acc.paid + category.totalPaid,
      remaining: acc.remaining + category.totalRemaining
    }), { actual: 0, paid: 0, remaining: 0 });
  }, [groupedData]);

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex justify-center items-center gap-3">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
          <p className="text-muted-foreground">Caricamento dati budget...</p>
        </div>
      </Card>
    );
  }

  if (!budgetData || groupedData.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">Inizia a pianificare il tuo budget</h3>
        <p className="text-muted-foreground mb-4">
          Aggiungi le voci di spesa previste, anche senza aver ancora scelto i fornitori.
        </p>
        <AddBudgetItemDialog />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget Spreadsheet</h2>
          <p className="text-muted-foreground">Panoramica completa delle spese pianificate</p>
        </div>
        <AddBudgetItemDialog />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[35%]">Voce di Spesa</TableHead>
              <TableHead className="w-[20%] text-right">
                Importo {getGuestCountLabel()}
              </TableHead>
              <TableHead className="w-[15%] text-right">Pagato</TableHead>
              <TableHead className="w-[15%] text-right">Residuo</TableHead>
              <TableHead className="w-[15%]">Stato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedData.map((category) => (
              <>
                {/* Header Categoria */}
                <TableRow
                  key={`category-${category.categoryId}`}
                  className="bg-muted/30 hover:bg-muted/50 cursor-pointer font-semibold"
                  onClick={() => toggleCategory(category.categoryId)}
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {expandedCategories.has(category.categoryId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <span className="uppercase tracking-wider text-xs text-muted-foreground">
                        {category.categoryName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-3 text-sm font-semibold">
                    {formatCurrency(category.totalActual)}
                  </TableCell>
                  <TableCell className="text-right py-3 text-sm font-semibold">
                    {formatCurrency(category.totalPaid)}
                  </TableCell>
                  <TableCell className="text-right py-3 text-sm font-semibold">
                    {formatCurrency(category.totalRemaining)}
                  </TableCell>
                  <TableCell className="py-3" />
                </TableRow>

                {/* Righe Spese (se espansa) */}
                {expandedCategories.has(category.categoryId) && category.rows.map((row) => {
                  const isPaidOff = row.actual > 0 && row.remaining <= 0;

                  return (
                    <TableRow key={row.id} className="hover:bg-accent/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-sm">{row.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {row.isPlaceholder ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedItem({ id: row.id, description: row.description });
                                    setAssignDialogOpen(true);
                                  }}
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-6 text-xs gap-1 px-2"
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  Da assegnare
                                </Button>
                              ) : (
                                <p className="text-xs text-muted-foreground">{row.vendorName}</p>
                              )}
                              {row.isVariableExpense && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs gap-1 h-5 cursor-help"
                                  title="Spesa variabile: l'importo dipende dal numero di invitati"
                                >
                                  🔄 Variabile
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        {row.actual > 0 ? (
                          <span className="font-medium">{formatCurrency(row.actual)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {row.paid > 0 ? (
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(row.paid)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {row.remaining > 0 ? (
                          <span className="font-medium text-orange-600 dark:text-orange-400">
                            {formatCurrency(row.remaining)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {isPaidOff ? (
                          <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Saldato
                          </Badge>
                        ) : row.paid > 0 ? (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                            <AlertCircle className="w-3 h-3" />
                            Parziale
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            In Attesa
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            ))}
            
            {/* Riga Totale Generale */}
            <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
              <TableCell className="py-4">
                <span className="text-base">TOTALE GENERALE</span>
              </TableCell>
              <TableCell className="text-right py-4 text-base text-orange-600 dark:text-orange-400">
                {formatCurrency(grandTotals.actual)}
              </TableCell>
              <TableCell className="text-right py-4 text-base text-green-600 dark:text-green-400">
                {formatCurrency(grandTotals.paid)}
              </TableCell>
              <TableCell className="text-right py-4 text-base text-orange-600 dark:text-orange-400">
                {formatCurrency(grandTotals.remaining)}
              </TableCell>
              <TableCell className="py-4" />
            </TableRow>
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Dialog per assegnare fornitore */}
      {selectedItem && (
        <AssignVendorDialog
          isOpen={assignDialogOpen}
          onClose={() => {
            setAssignDialogOpen(false);
            setSelectedItem(null);
          }}
          itemId={selectedItem.id}
          itemDescription={selectedItem.description}
        />
      )}
    </div>
  );
}
