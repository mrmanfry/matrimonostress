// Allocazione di un pagamento ai contributori (Io / Partner / split %).
// Usato sia al "Segna pagato" (modalità "mark") sia per modificare allocazioni
// di un pagamento già pagato (modalità "edit").
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fmt } from '@/lib/budgetAggregates';
import { Users, User, Split, Check } from 'lucide-react';

export interface AllocContributor {
  id: string;
  name: string;
}

export interface ExistingAllocation {
  contributor_id: string;
  amount: number;
}

type Mode = 'mark' | 'edit';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: Mode;
  paymentId: string | null;
  paymentAmount: number;
  paymentDescription?: string;
  vendorName?: string;
  contributors: AllocContributor[];
  existingAllocations?: ExistingAllocation[];
  /** Called after successful save. Used by parent to refresh data. */
  onSaved: () => void | Promise<void>;
}

type Strategy = 'single' | 'split';

export function PaymentAllocationDialog({
  open, onOpenChange, mode, paymentId, paymentAmount, paymentDescription,
  vendorName, contributors, existingAllocations, onSaved,
}: Props) {
  const { toast } = useToast();
  const [strategy, setStrategy] = React.useState<Strategy>('single');
  const [singleId, setSingleId] = React.useState<string>('');
  const [splitPct, setSplitPct] = React.useState<Record<string, number>>({});
  const [saving, setSaving] = React.useState(false);

  // Initialize state when opened
  React.useEffect(() => {
    if (!open) return;
    if (existingAllocations && existingAllocations.length > 0) {
      if (existingAllocations.length === 1) {
        setStrategy('single');
        setSingleId(existingAllocations[0].contributor_id);
      } else {
        setStrategy('split');
        const total = existingAllocations.reduce((s, a) => s + Number(a.amount || 0), 0) || paymentAmount || 1;
        const pct: Record<string, number> = {};
        for (const a of existingAllocations) {
          pct[a.contributor_id] = Math.round((Number(a.amount) / total) * 100);
        }
        setSplitPct(pct);
      }
    } else {
      // Default: pick first contributor (usually "Io")
      setStrategy('single');
      setSingleId(contributors[0]?.id ?? '');
      setSplitPct({});
    }
  }, [open, existingAllocations, contributors, paymentAmount]);

  const splitTotal = Object.values(splitPct).reduce((s, v) => s + (Number(v) || 0), 0);
  const splitValid = strategy === 'split' ? Math.round(splitTotal) === 100 : true;
  const canSave = !!paymentId && (strategy === 'single' ? !!singleId : splitValid);

  function handle5050() {
    if (contributors.length < 2) return;
    setStrategy('split');
    const a = contributors[0].id, b = contributors[1].id;
    setSplitPct({ [a]: 50, [b]: 50 });
  }

  async function handleSave() {
    if (!paymentId || !canSave) return;
    setSaving(true);
    try {
      // 1. If "mark" mode → update payment to Pagato
      if (mode === 'mark') {
        const { error: updErr } = await supabase
          .from('payments')
          .update({ status: 'Pagato', paid_on_date: new Date().toISOString().slice(0, 10) })
          .eq('id', paymentId);
        if (updErr) throw updErr;
      }

      // 2. Wipe existing allocations
      const { error: delErr } = await supabase
        .from('payment_allocations')
        .delete()
        .eq('payment_id', paymentId);
      if (delErr) throw delErr;

      // 3. Insert new allocations
      const rows: Array<{ payment_id: string; contributor_id: string; amount: number; percentage: number | null }> = [];
      if (strategy === 'single') {
        rows.push({
          payment_id: paymentId,
          contributor_id: singleId,
          amount: paymentAmount,
          percentage: 100,
        });
      } else {
        for (const [cid, pct] of Object.entries(splitPct)) {
          if (!pct || pct <= 0) continue;
          rows.push({
            payment_id: paymentId,
            contributor_id: cid,
            amount: Math.round((paymentAmount * pct) / 100 * 100) / 100,
            percentage: pct,
          });
        }
      }
      if (rows.length > 0) {
        const { error: insErr } = await supabase.from('payment_allocations').insert(rows);
        if (insErr) throw insErr;
      }

      toast({
        title: mode === 'mark' ? 'Pagamento registrato' : 'Allocazione aggiornata',
        description: rows.length === 1
          ? `Attribuito a ${contributors.find(c => c.id === rows[0].contributor_id)?.name ?? 'contributore'}`
          : `Diviso tra ${rows.length} contributori`,
      });
      await onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore imprevisto';
      toast({ title: 'Errore', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'mark' ? 'Chi ha pagato?' : 'Modifica attribuzione'}
          </DialogTitle>
          <DialogDescription>
            {paymentDescription ?? 'Pagamento'}
            {vendorName ? ` · ${vendorName}` : ''} · <strong>{fmt(paymentAmount)}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Strategy chips */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStrategy('single')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border text-sm font-medium transition ${
              strategy === 'single'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            <User className="h-3.5 w-3.5" /> Una persona
          </button>
          <button
            type="button"
            onClick={() => setStrategy('split')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border text-sm font-medium transition ${
              strategy === 'split'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            <Split className="h-3.5 w-3.5" /> Dividi %
          </button>
        </div>

        {strategy === 'single' && (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pagato da</Label>
            <div className="grid gap-1.5">
              {contributors.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSingleId(c.id)}
                  className={`flex items-center justify-between h-11 px-3 rounded-md border text-sm transition ${
                    singleId === c.id
                      ? 'bg-primary/5 border-primary text-foreground'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{c.name}</span>
                  </span>
                  {singleId === c.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
              {contributors.length === 0 && (
                <p className="text-sm text-muted-foreground">Nessun contributore configurato.</p>
              )}
            </div>
          </div>
        )}

        {strategy === 'split' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Divisione %</Label>
              {contributors.length >= 2 && (
                <button
                  type="button"
                  onClick={handle5050}
                  className="text-xs text-primary hover:underline"
                >
                  50/50 fra primi due
                </button>
              )}
            </div>
            <div className="grid gap-2">
              {contributors.map(c => {
                const pct = splitPct[c.id] || 0;
                const amount = Math.round((paymentAmount * pct) / 100);
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-medium truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">{fmt(amount)}</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={pct || ''}
                      onChange={e => setSplitPct(prev => ({ ...prev, [c.id]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                      className="w-20 h-9 text-right"
                      placeholder="0"
                    />
                    <span className="text-sm text-muted-foreground w-4">%</span>
                  </div>
                );
              })}
            </div>
            <div className={`text-xs px-2 py-1.5 rounded ${
              splitValid ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'
            }`}>
              Totale: <strong>{Math.round(splitTotal)}%</strong>
              {!splitValid && ' — deve essere 100%'}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Salvataggio…' : mode === 'mark' ? 'Conferma pagamento' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
