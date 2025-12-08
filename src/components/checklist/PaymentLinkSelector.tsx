import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Link2, Unlink, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Payment {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  status: string;
  expense_item?: {
    vendor?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

interface PaymentLinkSelectorProps {
  weddingId: string;
  currentPaymentId: string | null;
  onLink: (paymentId: string | null) => Promise<void>;
}

export function PaymentLinkSelector({ 
  weddingId, 
  currentPaymentId, 
  onLink 
}: PaymentLinkSelectorProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadPayments();
  }, [weddingId]);

  const loadPayments = async () => {
    try {
      // Get all unpaid payments for this wedding
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          description,
          amount,
          due_date,
          status,
          expense_item:expense_items(
            vendor:vendors(id, name)
          )
        `)
        .eq("expense_item.wedding_id", weddingId)
        .neq("status", "Pagato")
        .order("due_date", { ascending: true });

      if (error) throw error;
      
      // Filter out null expense_items and flatten
      const validPayments = (data || []).filter(p => p.expense_item !== null);
      setPayments(validPayments);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (paymentId: string) => {
    if (paymentId === "none") {
      await handleUnlink();
      return;
    }
    
    setLinking(true);
    try {
      await onLink(paymentId);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    setLinking(true);
    try {
      await onLink(null);
    } finally {
      setLinking(false);
    }
  };

  const linkedPayment = currentPaymentId 
    ? payments.find(p => p.id === currentPaymentId) 
    : null;

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Caricamento pagamenti...
      </div>
    );
  }

  // If already linked, show the linked payment
  if (linkedPayment) {
    const vendorName = linkedPayment.expense_item?.vendor?.name || "Fornitore";
    const vendorId = linkedPayment.expense_item?.vendor?.id;
    
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          Collegato a Pagamento
        </Label>
        <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
          <CreditCard className="w-4 h-4 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{linkedPayment.description}</p>
            <p className="text-xs text-muted-foreground">
              {vendorName} • €{linkedPayment.amount.toLocaleString("it-IT")}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {vendorId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate(`/app/vendors/${vendorId}?tab=expenses`)}
                title="Vai al pagamento"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleUnlink}
              disabled={linking}
              title="Scollega pagamento"
            >
              <Unlink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show selector for linking
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <CreditCard className="w-3 h-3" />
        Collega a Pagamento
      </Label>
      {payments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Nessun pagamento disponibile da collegare
        </p>
      ) : (
        <Select
          value=""
          onValueChange={handleLink}
          disabled={linking}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Seleziona pagamento..." />
          </SelectTrigger>
          <SelectContent>
            {payments.map((payment) => {
              const vendorName = payment.expense_item?.vendor?.name || "Fornitore";
              return (
                <SelectItem key={payment.id} value={payment.id}>
                  <div className="flex items-center gap-2">
                    <span className="truncate">{payment.description}</span>
                    <Badge variant="outline" className="text-xs">
                      {vendorName}
                    </Badge>
                    <span className="text-muted-foreground">
                      €{payment.amount.toLocaleString("it-IT")}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
      <p className="text-xs text-muted-foreground">
        Collegando un pagamento, completare questo task segnerà automaticamente il pagamento come "Pagato"
      </p>
    </div>
  );
}
