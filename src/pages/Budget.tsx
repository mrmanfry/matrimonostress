import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Euro,
  Plus,
  Edit,
  Trash2,
  FolderOpen,
  AlertCircle,
  Calendar,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { ExpenseDialog } from "@/components/budget/ExpenseDialog";
import { PaymentDialog } from "@/components/budget/PaymentDialog";
import { CategoryManager } from "@/components/budget/CategoryManager";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Wedding {
  id: string;
  total_budget: number | null;
}

interface Category {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
  category_id?: string | null;
}

interface Expense {
  id: string;
  description: string;
  category_id: string;
  category_name: string;
  estimated_amount: number;
  final_amount: number | null;
  vendor_id: string | null;
  vendor_name?: string;
}

interface Payment {
  id: string;
  expense_id: string;
  description: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  paid_by: string;
}

const Budget = () => {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedExpenseForPayment, setSelectedExpenseForPayment] = useState<Expense | null>(null);
  const [newBudget, setNewBudget] = useState("");
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const vendorFilter = searchParams.get("vendor");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id, total_budget")
        .limit(1)
        .maybeSingle();

      if (!weddingData) return;
      setWedding(weddingData);
      setNewBudget(weddingData.total_budget?.toString() || "");

      await Promise.all([
        loadCategories(weddingData.id),
        loadVendors(weddingData.id),
        loadExpenses(weddingData.id),
        loadPayments(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async (weddingId: string) => {
    const { data } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("name", { ascending: true });

    setCategories(data || []);
  };

  const loadVendors = async (weddingId: string) => {
    const { data } = await supabase
      .from("vendors")
      .select("id, name, category_id")
      .eq("wedding_id", weddingId)
      .order("name", { ascending: true });

    setVendors(data || []);
  };

  const loadExpenses = async (weddingId: string) => {
    const { data } = await supabase
      .from("expenses")
      .select(`
        *,
        expense_categories(name),
        vendors(name)
      `)
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false });

    if (data) {
      const formatted = data.map((e: any) => ({
        ...e,
        category_name: e.expense_categories?.name || "Senza categoria",
        vendor_name: e.vendors?.name || null,
      }));
      setExpenses(formatted);
    }
  };

  const loadPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .order("due_date", { ascending: true });

    setPayments(data || []);
  };

  const handleUpdateBudget = async () => {
    if (!wedding) return;

    const budgetValue = parseFloat(newBudget);
    if (isNaN(budgetValue) || budgetValue < 0) {
      toast({
        title: "Errore",
        description: "Inserisci un budget valido",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("weddings")
      .update({ total_budget: budgetValue })
      .eq("id", wedding.id);

    if (error) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setWedding({ ...wedding, total_budget: budgetValue });
    toast({
      title: "Aggiornato!",
      description: "Budget totale modificato",
    });
  };

  const handleSaveExpense = async (expenseData: Omit<Expense, "id" | "category_name">) => {
    if (!wedding) return;

    try {
      if (selectedExpense) {
        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", selectedExpense.id);

        if (error) throw error;

        toast({
          title: "Aggiornato!",
          description: "Spesa modificata",
        });
      } else {
        const { error } = await supabase
          .from("expenses")
          .insert({ ...expenseData, wedding_id: wedding.id });

        if (error) throw error;

        toast({
          title: "Creato!",
          description: "Nuova spesa aggiunta",
        });
      }

      await loadExpenses(wedding.id);
      setSelectedExpense(null);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Eliminare questa spesa e tutti i pagamenti associati?")) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Eliminato",
      description: "Spesa rimossa",
    });

    if (wedding) {
      await Promise.all([loadExpenses(wedding.id), loadPayments()]);
    }
  };

  const handleSavePayment = async (paymentData: Omit<Payment, "id">) => {
    try {
      if (selectedPayment) {
        const { error } = await supabase
          .from("payments")
          .update(paymentData)
          .eq("id", selectedPayment.id);

        if (error) throw error;

        toast({
          title: "Aggiornato!",
          description: "Pagamento modificato",
        });
      } else {
        const { error } = await supabase.from("payments").insert(paymentData);

        if (error) throw error;

        toast({
          title: "Creato!",
          description: "Nuovo pagamento aggiunto",
        });
      }

      await loadPayments();
      setSelectedPayment(null);
      setSelectedExpenseForPayment(null);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Eliminare questo pagamento?")) return;

    const { error } = await supabase.from("payments").delete().eq("id", id);

    if (error) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Eliminato",
      description: "Pagamento rimosso",
    });

    await loadPayments();
  };

  const handleCreateCategory = async (name: string) => {
    if (!wedding) return;

    const { error } = await supabase
      .from("expense_categories")
      .insert({ wedding_id: wedding.id, name });

    if (error) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }

    toast({
      title: "Creato!",
      description: `Categoria "${name}" aggiunta`,
    });

    await loadCategories(wedding.id);
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase
      .from("expense_categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }

    toast({
      title: "Eliminato",
      description: "Categoria rimossa",
    });

    if (wedding) {
      await Promise.all([loadCategories(wedding.id), loadExpenses(wedding.id)]);
    }
  };

  const getExpensePayments = (expenseId: string) =>
    payments.filter((p) => p.expense_id === expenseId);

  const getDaysUntilDue = (dueDate: string): number => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPaymentBadge = (payment: Payment) => {
    if (payment.status === "paid") {
      return <Badge className="bg-green-600">Pagato</Badge>;
    }

    const daysUntil = getDaysUntilDue(payment.due_date);
    if (daysUntil < 0) {
      return <Badge variant="destructive">Scaduto</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge className="bg-orange-500">Urgente ({daysUntil}g)</Badge>;
    }
    return <Badge variant="secondary">Da pagare</Badge>;
  };

  // Apply vendor filter first
  const filteredExpenses = vendorFilter 
    ? expenses.filter(e => e.vendor_id === vendorFilter)
    : expenses;

  // Stats (with vendor filter applied)
  const totalBudget = wedding?.total_budget || 0;
  const totalSpent = filteredExpenses.reduce(
    (sum, e) => sum + (e.final_amount || e.estimated_amount),
    0
  );
  
  // Filter payments based on filtered expenses
  const filteredPayments = vendorFilter
    ? payments.filter(p => filteredExpenses.some(e => e.id === p.expense_id))
    : payments;
  
  const totalPaid = filteredPayments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalPending = filteredPayments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalBudget - totalSpent;
  const percentageSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const urgentPayments = filteredPayments.filter(
    (p) => p.status === "pending" && getDaysUntilDue(p.due_date) <= 7
  );

  // Group by category (with vendor filter applied)
  const expensesByCategory = categories.map((cat) => {
    const catExpenses = filteredExpenses.filter((e) => e.category_id === cat.id);
    const catTotal = catExpenses.reduce(
      (sum, e) => sum + (e.final_amount || e.estimated_amount),
      0
    );
    return {
      ...cat,
      expenses: catExpenses,
      total: catTotal,
    };
  });

  const filteredVendor = vendorFilter 
    ? vendors.find(v => v.id === vendorFilter)
    : null;

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Euro className="w-8 h-8 text-gold" />
          <h1 className="text-3xl font-bold">Gestione Budget</h1>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Controlla le spese e i pagamenti per il tuo matrimonio
          </p>
          {filteredVendor && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                Filtro: {filteredVendor.name}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  searchParams.delete("vendor");
                  setSearchParams(searchParams);
                }}
              >
                Rimuovi filtro
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Budget Overview */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Budget Totale</h2>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="w-32"
                min="0"
                step="100"
              />
              <Button onClick={handleUpdateBudget} size="sm">
                Aggiorna
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Speso: €{totalSpent.toLocaleString("it-IT")}</span>
              <span>Rimanente: €{remaining.toLocaleString("it-IT")}</span>
            </div>
            <Progress value={percentageSpent} className="h-3" />
            <p className="text-center text-sm text-muted-foreground">
              {percentageSpent.toFixed(1)}% del budget utilizzato
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm text-muted-foreground">Pagato</span>
          </div>
          <div className="text-2xl font-bold">€{totalPaid.toLocaleString("it-IT")}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-muted-foreground">Da Pagare</span>
          </div>
          <div className="text-2xl font-bold">€{totalPending.toLocaleString("it-IT")}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-muted-foreground">Spese{vendorFilter ? " (Filtrate)" : ""}</span>
          </div>
          <div className="text-2xl font-bold">{filteredExpenses.length}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-red-600" />
            <span className="text-sm text-muted-foreground">Urgenti</span>
          </div>
          <div className="text-2xl font-bold">{urgentPayments.length}</div>
        </Card>
      </div>

      {/* Urgent Payments */}
      {urgentPayments.length > 0 && (
        <Card className="p-4 bg-red-50 dark:bg-red-950/20 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Pagamenti Urgenti</h3>
              <div className="space-y-2">
                {urgentPayments.map((payment) => {
                  const expense = expenses.find((e) => e.id === payment.expense_id);
                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {expense?.description} - {payment.description}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          €{payment.amount.toLocaleString("it-IT")}
                        </span>
                        {getPaymentBadge(payment)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              setSelectedExpense(null);
              setExpenseDialogOpen(true);
            }}
            disabled={categories.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuova Spesa
          </Button>

          <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Gestisci Categorie
          </Button>

          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground ml-2 flex items-center">
              Crea prima una categoria per aggiungere spese
            </p>
          )}
        </div>
      </Card>

      {/* Expenses by Category */}
      {expensesByCategory.length === 0 ? (
        <Card className="p-8 text-center">
          <Euro className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nessuna categoria presente. Inizia creando categorie e spese!
          </p>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {expensesByCategory.map((category) => (
            <AccordionItem key={category.id} value={category.id} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="font-semibold">{category.name}</span>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">
                      {category.expenses.length} spes{category.expenses.length === 1 ? "a" : "e"}
                    </Badge>
                    <span className="text-lg font-bold">
                      €{category.total.toLocaleString("it-IT")}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-4 pb-4 space-y-3">
                  {category.expenses.map((expense) => {
                    const expensePayments = getExpensePayments(expense.id);
                    const totalPaidForExpense = expensePayments
                      .filter((p) => p.status === "paid")
                      .reduce((sum, p) => sum + p.amount, 0);

                    return (
                      <Card key={expense.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{expense.description}</h4>
                              {expense.vendor_name && (
                                <p className="text-sm text-muted-foreground">
                                  Fornitore: {expense.vendor_name}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span>
                                  Stimato: €{expense.estimated_amount.toLocaleString("it-IT")}
                                </span>
                                {expense.final_amount && (
                                  <span>
                                    Finale: €{expense.final_amount.toLocaleString("it-IT")}
                                  </span>
                                )}
                                <span>
                                  Pagato: €{totalPaidForExpense.toLocaleString("it-IT")}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setExpenseDialogOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteExpense(expense.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Payments */}
                          <div className="border-t pt-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Pagamenti</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedExpenseForPayment(expense);
                                  setSelectedPayment(null);
                                  setPaymentDialogOpen(true);
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Aggiungi
                              </Button>
                            </div>

                            {expensePayments.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                Nessun pagamento pianificato
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {expensePayments.map((payment) => (
                                  <div
                                    key={payment.id}
                                    className="flex items-center justify-between p-2 rounded bg-muted/30"
                                  >
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">
                                        {payment.description}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Scadenza:{" "}
                                        {new Date(payment.due_date).toLocaleDateString("it-IT")}
                                        {payment.paid_by && ` • ${payment.paid_by}`}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        €{payment.amount.toLocaleString("it-IT")}
                                      </span>
                                      {getPaymentBadge(payment)}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => {
                                          setSelectedExpenseForPayment(expense);
                                          setSelectedPayment(payment);
                                          setPaymentDialogOpen(true);
                                        }}
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleDeletePayment(payment.id)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Dialogs */}
      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        expense={selectedExpense}
        categories={categories}
        vendors={vendors}
        onSave={handleSaveExpense}
      />

      {selectedExpenseForPayment && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          payment={selectedPayment}
          expenseId={selectedExpenseForPayment.id}
          expenseDescription={selectedExpenseForPayment.description}
          onSave={handleSavePayment}
        />
      )}

      <CategoryManager
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        categories={categories.map((cat) => {
          const catExpenses = expenses.filter((e) => e.category_id === cat.id);
          const catTotal = catExpenses.reduce(
            (sum, e) => sum + (e.final_amount || e.estimated_amount),
            0
          );
          return {
            ...cat,
            expense_count: catExpenses.length,
            total_spent: catTotal,
          };
        })}
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    </div>
  );
};

export default Budget;
