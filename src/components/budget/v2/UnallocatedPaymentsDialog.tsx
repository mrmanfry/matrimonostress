// Lista pagamenti pagati senza allocazione completa ai contributori.
// Da qui l'utente può aprire il PaymentAllocationDialog esistente per
// assegnare retroattivamente il pagamento ai fondi di progetto.
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fmt, fmtDate, type UiPayment } from '@/lib/budgetAggregates';

export interface UnallocatedRow {
  payment: UiPayment;
  allocated: number;
  unallocated: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rows: UnallocatedRow[];
  onAssign: (payment: UiPayment) => void;
}

export function UnallocatedPaymentsDialog({ open, onOpenChange, rows, onAssign }: Props) {
  const total = rows.reduce((s, r) => s + r.unallocated, 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pagamenti non allocati</DialogTitle>
          <DialogDescription>
            {rows.length} pagamenti pagati senza contributore assegnato · totale non allocato <strong>{fmt(total)}</strong>.
            Assegna ogni pagamento al fondo (o ai fondi) che lo ha coperto.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
          {rows.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              Nessun pagamento da allocare.
            </div>
          )}
          {rows.map(({ payment, allocated, unallocated }) => (
            <div
              key={payment.id}
              className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{payment.vendorName}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {payment.desc} · {fmtDate(payment.due)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono font-semibold">{fmt(payment.amount)}</div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  allocato {fmt(allocated)} · resta {fmt(unallocated)}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAssign(payment)}
                className="shrink-0"
              >
                Assegna
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
