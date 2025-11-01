-- FASE 1: Fondamenta Sistema Multi-Contributore
-- Aggiunge target di contribuzione e tabella per suddivisioni pagamenti

-- 1. Aggiungi colonna target di contribuzione
ALTER TABLE public.financial_contributors 
ADD COLUMN contribution_target NUMERIC DEFAULT NULL;

COMMENT ON COLUMN public.financial_contributors.contribution_target IS 'Target di contribuzione opzionale (es. €5000 per "Genitori Ludo")';

-- 2. Crea tabella per suddivisioni pagamenti (la killer feature)
CREATE TABLE public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES public.financial_contributors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  percentage NUMERIC CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payment_id, contributor_id)
);

COMMENT ON TABLE public.payment_allocations IS 'Suddivisione di un pagamento tra più contributori (es. Ludo €600 + Filippo €400 = €1000 totale)';
COMMENT ON COLUMN public.payment_allocations.amount IS 'Importo allocato a questo contributore per questo pagamento';
COMMENT ON COLUMN public.payment_allocations.percentage IS 'Percentuale opzionale (se si preferisce tracciare % invece di importo fisso)';

-- 3. Abilita RLS su payment_allocations
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Gli utenti possono vedere le allocazioni dei pagamenti a cui hanno accesso
CREATE POLICY "Users can view allocations for accessible payments"
ON public.payment_allocations FOR SELECT
USING (
  payment_id IN (
    SELECT p.id FROM public.payments p
    JOIN public.expense_items ei ON p.expense_item_id = ei.id
    WHERE has_wedding_access(auth.uid(), ei.wedding_id)
  )
);

-- 5. Policy: Co-planners e manager possono gestire le allocazioni
CREATE POLICY "Co-planners and managers can manage allocations"
ON public.payment_allocations FOR ALL
USING (
  payment_id IN (
    SELECT p.id FROM public.payments p
    JOIN public.expense_items ei ON p.expense_item_id = ei.id
    WHERE has_wedding_role(auth.uid(), ei.wedding_id, 'co_planner'::app_role) 
       OR has_wedding_role(auth.uid(), ei.wedding_id, 'manager'::app_role)
  )
);

-- NOTA: Il campo payments.paid_by rimane per backward compatibility ma diventa deprecated.
-- La nuova fonte di verità è payment_allocations.