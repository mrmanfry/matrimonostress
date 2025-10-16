import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paymentSchema, type PaymentFormData } from "@/lib/validationSchemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Payment {
  id?: string;
  expense_id: string;
  description: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  paid_by: string;
  status: string;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  expenseId: string;
  expenseDescription: string;
  onSave: (payment: Payment) => Promise<void>;
}

const emptyPayment = {
  description: "",
  amount: 0,
  due_date: "",
  paid_at: undefined,
  paid_by: "",
  status: "pending" as const,
  expense_id: "",
};

export function PaymentDialog({
  open,
  onOpenChange,
  payment,
  expenseId,
  expenseDescription,
  onSave,
}: PaymentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { ...emptyPayment, expense_id: expenseId },
  });

  const dueDate = watch("due_date");
  const status = watch("status");

  useEffect(() => {
    if (payment) {
      const paymentStatus = payment.status === "paid" || payment.status === "pending" 
        ? payment.status as PaymentFormData["status"]
        : "pending" as PaymentFormData["status"];
      
      reset({
        description: payment.description,
        amount: payment.amount,
        due_date: payment.due_date,
        status: paymentStatus,
        paid_by: payment.paid_by || "",
        paid_at: payment.paid_at || undefined,
        expense_id: payment.expense_id,
      });
    } else {
      reset({ ...emptyPayment, expense_id: expenseId });
    }
  }, [payment, expenseId, open, reset]);

  const onSubmit = async (data: PaymentFormData) => {
    try {
      const paymentData = {
        ...data,
        id: payment?.id,
        description: data.description,
        amount: data.amount,
        due_date: data.due_date,
        status: data.status,
        paid_by: data.paid_by || "",
        paid_at: data.paid_at || null,
        expense_id: data.expense_id,
      };
      await onSave(paymentData as Payment);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving payment:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {payment ? "Modifica Pagamento" : "Nuovo Pagamento"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Spesa: {expenseDescription}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione *</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="Es: Acconto 30%, Saldo finale"
              maxLength={200}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Importo (€) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Scadenza *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(new Date(dueDate), "PPP", { locale: it }) : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate ? new Date(dueDate) : undefined}
                    onSelect={(date) => 
                      setValue("due_date", date ? date.toISOString().split("T")[0] : "", { shouldValidate: true })
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {errors.due_date && (
                <p className="text-sm text-destructive">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Stato *</Label>
              <Select
                value={status}
                onValueChange={(value) => setValue("status", value as PaymentFormData["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Da pagare</SelectItem>
                  <SelectItem value="paid">Pagato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paid_by">Pagato da</Label>
              <Input
                id="paid_by"
                {...register("paid_by")}
                placeholder="Es: Mario, Sofia"
                maxLength={100}
              />
              {errors.paid_by && (
                <p className="text-sm text-destructive">{errors.paid_by.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
