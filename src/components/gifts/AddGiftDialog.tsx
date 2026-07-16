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

const baseFields = {
  amount: z.coerce.number().optional(),
  notes: z.string().optional(),
  donor_name: z.string().optional(),
};

const schema = z.discriminatedUnion('gift_category', [
  z.object({
    gift_category: z.literal('cash'),
    amount: z.coerce.number({ invalid_type_error: 'Inserisci un importo valido' }).min(0, "L'importo non può essere negativo"),
    notes: z.string().optional(),
    donor_name: z.string().optional(),
  }),
  z.object({ gift_category: z.literal('physical_registry'), ...baseFields }),
  z.object({ gift_category: z.literal('other'), ...baseFields }),
]);

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** null/undefined = regalo esterno (persona non invitata) */
  partyId?: string | null;
  partyName?: string;
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
  const isExternal = !partyId;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gift_category: 'cash', amount: undefined, notes: '', donor_name: '' },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    if (isExternal && !values.donor_name?.trim()) {
      form.setError('donor_name' as any, { message: 'Inserisci il nome di chi ha fatto il regalo' });
      return;
    }
    try {
      await addGift.mutateAsync({
        party_id: partyId ?? null,
        donor_name: isExternal ? values.donor_name?.trim() || null : null,
        gift_category: values.gift_category,
        amount: values.gift_category === 'cash' ? (values as any).amount : (values.amount ?? null),
        notes: values.notes || null,
      } as any);
      toast.success('Regalo registrato');
      onOpenChange(false);
      form.reset({ gift_category: 'cash', amount: undefined, notes: '', donor_name: '' });
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

  const title = isExternal
    ? 'Aggiungi regalo esterno'
    : `Aggiungi regalo — ${partyName ?? ''}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isExternal && (
            <div className="space-y-1">
              <Label htmlFor="donor_name">Da chi arriva *</Label>
              <Input
                id="donor_name"
                placeholder="Nome e cognome (es. Zia Anna)"
                {...form.register('donor_name')}
              />
              {(form.formState.errors as any).donor_name && (
                <p className="text-xs text-destructive">{(form.formState.errors as any).donor_name.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Persona non presente nella lista invitati.
              </p>
            </div>
          )}

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
