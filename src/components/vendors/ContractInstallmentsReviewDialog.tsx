import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Trash2, Plus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface ExtractedInstallment {
  description: string;
  amount: number | null;
  percentage: number | null;
  due_date: string | null;
  days_before_wedding: number | null;
  tax_inclusive: boolean;
  tax_rate: number;
  payment_method: string | null;
  confidence: number;
  source_quote: string;
}

interface DraftRow extends ExtractedInstallment {
  enabled: boolean;
  mode: "fixed" | "percentage";
  dateMode: "absolute" | "days_before";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installments: ExtractedInstallment[];
  vendorId: string;
  weddingId: string;
  weddingDate?: string | null;
  onSaved?: () => void;
}

export function ContractInstallmentsReviewDialog({
  open,
  onOpenChange,
  installments,
  vendorId,
  weddingId,
  weddingDate,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState<DraftRow[]>(() =>
    installments.map((i) => ({
      ...i,
      enabled: true,
      mode: i.amount != null ? "fixed" : i.percentage != null ? "percentage" : "fixed",
      dateMode: i.due_date ? "absolute" : i.days_before_wedding != null ? "days_before" : "absolute",
      tax_rate: i.tax_rate ?? 22,
      tax_inclusive: i.tax_inclusive ?? true,
    })),
  );

  const enabledCount = useMemo(() => rows.filter((r) => r.enabled).length, [rows]);

  const update = (idx: number, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        enabled: true,
        description: "",
        amount: null,
        percentage: null,
        due_date: null,
        days_before_wedding: null,
        tax_inclusive: true,
        tax_rate: 22,
        payment_method: null,
        confidence: 1,
        source_quote: "",
        mode: "fixed",
        dateMode: "absolute",
      },
    ]);
  };

  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const handleConfirm = async () => {
    const selected = rows.filter((r) => r.enabled);
    if (selected.length === 0) {
      toast({ title: "Nessuna rata selezionata", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // 1. Find or create expense_item for this vendor
      let { data: expense } = await supabase
        .from("expense_items")
        .select("id")
        .eq("vendor_id", vendorId)
        .eq("wedding_id", weddingId)
        .maybeSingle();

      let expenseItemId = expense?.id;

      if (!expenseItemId) {
        const { data: vendor } = await supabase
          .from("vendors")
          .select("name, category_id")
          .eq("id", vendorId)
          .single();

        const { data: newExp, error: expErr } = await supabase
          .from("expense_items")
          .insert({
            vendor_id: vendorId,
            wedding_id: weddingId,
            name: vendor?.name || "Fornitore",
            category_id: vendor?.category_id ?? null,
            calculation_mode: "fixed",
          })
          .select("id")
          .single();
        if (expErr) throw expErr;
        expenseItemId = newExp.id;
      }

      // 2. Build payment rows
      const paymentRows = selected.map((r) => {
        const isPct = r.mode === "percentage" && r.percentage != null;
        const amount = isPct ? 0 : Number(r.amount || 0);
        const due_date =
          r.dateMode === "absolute" && r.due_date
            ? r.due_date
            : format(new Date(), "yyyy-MM-dd");
        return {
          expense_item_id: expenseItemId,
          description: r.description || "Rata da contratto",
          amount,
          amount_type: isPct ? "percentage" : "fixed",
          percentage_value: isPct ? r.percentage : null,
          due_date,
          due_date_type: r.dateMode,
          days_before_wedding: r.dateMode === "days_before" ? r.days_before_wedding : null,
          status: "Da Pagare",
          tax_rate: r.tax_rate,
          tax_inclusive: r.tax_inclusive,
        };
      });

      const { error: insErr } = await supabase.from("payments").insert(paymentRows);
      if (insErr) throw insErr;

      toast({
        title: "Rate create",
        description: `${paymentRows.length} rate aggiunte al piano di pagamento. I task collegati saranno generati automaticamente.`,
      });

      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Errore",
        description: e.message || "Impossibile salvare le rate",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Piano di pagamento proposto dall'AI
          </DialogTitle>
          <DialogDescription>
            Rivedi le rate estratte dal contratto. Puoi modificarle, deselezionarle o aggiungerne di nuove prima di confermare.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 pb-2">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nessuna rata trovata. Aggiungine una manualmente.
              </p>
            )}
            {rows.map((r, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-3 space-y-3 ${!r.enabled ? "opacity-50" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={r.enabled}
                    onCheckedChange={(v) => update(idx, { enabled: !!v })}
                    className="mt-1"
                  />
                  <Input
                    value={r.description}
                    onChange={(e) => update(idx, { description: e.target.value })}
                    placeholder="Descrizione (es. Acconto alla firma)"
                    className="flex-1"
                  />
                  {r.confidence > 0 && (
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {Math.round(r.confidence * 100)}%
                    </Badge>
                  )}
                  {r.source_quote && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground mt-2 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs italic">"{r.source_quote}"</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeRow(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-7">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo importo</Label>
                    <Select value={r.mode} onValueChange={(v: any) => update(idx, { mode: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">€ Fisso</SelectItem>
                        <SelectItem value="percentage">% Percentuale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {r.mode === "fixed" ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Importo €</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={r.amount ?? ""}
                        onChange={(e) => update(idx, { amount: e.target.value ? Number(e.target.value) : null })}
                        className="h-9"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs">Percentuale</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={r.percentage ?? ""}
                        onChange={(e) => update(idx, { percentage: e.target.value ? Number(e.target.value) : null })}
                        className="h-9"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs">Scadenza</Label>
                    <Select value={r.dateMode} onValueChange={(v: any) => update(idx, { dateMode: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="absolute">Data fissa</SelectItem>
                        <SelectItem value="days_before">Giorni prima nozze</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {r.dateMode === "absolute" ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Data</Label>
                      <Input
                        type="date"
                        value={r.due_date ?? ""}
                        onChange={(e) => update(idx, { due_date: e.target.value || null })}
                        className="h-9"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs">Giorni prima</Label>
                      <Input
                        type="number"
                        value={r.days_before_wedding ?? ""}
                        onChange={(e) => update(idx, { days_before_wedding: e.target.value ? Number(e.target.value) : null })}
                        className="h-9"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-7">
                  <div className="space-y-1">
                    <Label className="text-xs">IVA %</Label>
                    <Input
                      type="number"
                      value={r.tax_rate}
                      onChange={(e) => update(idx, { tax_rate: Number(e.target.value) || 0 })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">IVA</Label>
                    <Select
                      value={r.tax_inclusive ? "incl" : "excl"}
                      onValueChange={(v) => update(idx, { tax_inclusive: v === "incl" })}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incl">Inclusa</SelectItem>
                        <SelectItem value="excl">Esclusa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Metodo pagamento</Label>
                    <Input
                      value={r.payment_method ?? ""}
                      onChange={(e) => update(idx, { payment_method: e.target.value || null })}
                      placeholder="bonifico, contanti…"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addRow} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Aggiungi rata manuale
            </Button>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleConfirm} disabled={saving || enabledCount === 0}>
            {saving ? "Salvataggio…" : `Conferma ${enabledCount} rate`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
