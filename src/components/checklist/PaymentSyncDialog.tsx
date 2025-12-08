import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreditCard, Check } from "lucide-react";

interface PaymentSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentDescription: string;
  paymentAmount: number;
  vendorName: string;
  onConfirm: () => void;
  onSkip: () => void;
}

export function PaymentSyncDialog({
  open,
  onOpenChange,
  paymentDescription,
  paymentAmount,
  vendorName,
  onConfirm,
  onSkip,
}: PaymentSyncDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Sincronizza Pagamento?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Questo task è collegato a un pagamento. Vuoi segnare anche il
                pagamento come "Pagato"?
              </p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">{paymentDescription}</p>
                <p className="text-sm">
                  {vendorName} • €{paymentAmount.toLocaleString("it-IT")}
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onSkip}>
            Solo il task
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="gap-2">
            <Check className="w-4 h-4" />
            Segna Entrambi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
