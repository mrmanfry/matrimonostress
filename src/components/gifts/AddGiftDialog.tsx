import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAddGift, type GiftCategory } from '@/hooks/useGifts';

const schema = z.discriminatedUnion('gift_category', [
  z.object({
    gift_category: z.literal('cash'),
    amount: z.coerce.number().positive('Inserisci un importo valido'),
    notes: z.string().optional(),
  }),
  z.object({
    gift_category: z.literal('physical_registry'),
    amount: z.coerce.number().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    gift_category: z.literal('other'),
    amount: z.coerce.number().optional(),
    notes: z.string().optional(),
  }),
]);

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partyId: string;
  partyName: string;
  weddingId: string;
}

const categoryLabels: Record<GiftCategory, string> = {
  cash: 'Contanti / Bonifico',
  physical_registry: 'Lista Nozze / Fisico',
  other: 'Altro',
};

export function AddGiftDialog({ open, onOpenChange, partyId, partyName, weddingId }: Props) {
  const [category, setCategory] = useState<GiftCategory>('cash');
  const addGift = useAddGift(weddingId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gift_category: 'cash', amount: undefined, notes: '' },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await addGift.mutateAsync({
        party_id: partyId,
        gift_category: values.gift_category,
        amount: values.gift_category === 'cash' ? (values as any).amount : (values.amount ?? null),
        notes: values.notes || null,
      });
      toast.success('Regalo registrato');
      onOpenChange(false);
      form.reset({ gift_category: 'cash', amount: undefined, notes: '' });
      setCategory('cash');
    } catch {
      toast.error('Errore nel salvataggio del regalo');
    }
  });

  const handleCategoryChange = (val: string) => {
    const cat = val as GiftCategory;
    setCategory(cat);
    form.setValue('gift_category', cat as any);
    form.clearErrors();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi regalo — {partyName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Tipo di regalo</Label>
            <RadioGroup value={category} onValueChange={handleCategoryChange} className="flex flex-col gap-2">
              {(Object.keys(categoryLabels) as GiftCategory[]).map((cat) => (
                <div key={cat} className="flex items-center gap-2">
                  <RadioGroupItem value={cat} id={`cat-${cat}`} />
                  <Label htmlFor={`cat-${cat}`} className="font-normal cursor-pointer">
                    {categoryLabels[cat]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {(category === 'cash' || category === 'physical_registry') && (
            <div className="space-y-1">
              <Label htmlFor="amount">
                Importo {category === 'cash' ? '(€) *' : '(€, opzionale)'}
              </Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                {...form.register('amount')}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="notes">Note (opzionale)</Label>
            <Textarea
              id="notes"
              placeholder="Descrizione regalo, metodo di pagamento..."
              rows={2}
              {...form.register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={addGift.isPending}>
              {addGift.isPending ? 'Salvataggio...' : 'Salva regalo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
