-- ============================================================================
-- FASE 1: Migrazione Sistema "Orizzonte Liquidità"
-- ============================================================================

-- Step 1: Creare la tabella expense_items (contenitore spesa)
CREATE TABLE IF NOT EXISTS public.expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Modificare la tabella payments per il nuovo sistema
-- Prima rinominiamo la vecchia tabella
ALTER TABLE IF EXISTS public.payments RENAME TO payments_old;

-- Creiamo la nuova tabella payments con la struttura rifatta
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_item_id UUID NOT NULL REFERENCES public.expense_items(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Da Pagare' CHECK (status IN ('Da Pagare', 'Pagato')),
  paid_on_date DATE,
  tax_rate NUMERIC CHECK (tax_rate >= 0 AND tax_rate <= 100),
  tax_inclusive BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Migrare i dati esistenti
-- Prima migriamo le expenses in expense_items
INSERT INTO public.expense_items (id, wedding_id, vendor_id, description, category_id, created_at, updated_at)
SELECT 
  id,
  wedding_id,
  vendor_id,
  description,
  category_id,
  created_at,
  updated_at
FROM public.expenses;

-- Poi migriamo i payments esistenti collegandoli agli expense_items
INSERT INTO public.payments (id, expense_item_id, description, amount, due_date, status, paid_on_date, created_at, updated_at)
SELECT 
  po.id,
  po.expense_id, -- Questo diventa expense_item_id
  po.description,
  po.amount,
  po.due_date,
  CASE 
    WHEN po.status = 'paid' THEN 'Pagato'
    ELSE 'Da Pagare'
  END,
  po.paid_at,
  po.created_at,
  po.updated_at
FROM public.payments_old po;

-- Step 4: Rimuovere la vecchia tabella expenses (i dati sono ora in expense_items)
DROP TABLE IF EXISTS public.expenses CASCADE;

-- Step 5: Rimuovere la vecchia tabella payments_old
DROP TABLE IF EXISTS public.payments_old CASCADE;

-- Step 6: Abilitare RLS su expense_items
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;

-- Politiche RLS per expense_items
CREATE POLICY "Users can view expense items for accessible weddings"
  ON public.expense_items FOR SELECT
  USING (has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners and managers can manage expense items"
  ON public.expense_items FOR ALL
  USING (
    has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
    has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
  );

-- Step 7: Abilitare RLS su payments (nuova struttura)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Politiche RLS per payments
CREATE POLICY "Users can view payments for accessible expense items"
  ON public.payments FOR SELECT
  USING (
    expense_item_id IN (
      SELECT id FROM public.expense_items 
      WHERE has_wedding_access(auth.uid(), wedding_id)
    )
  );

CREATE POLICY "Co-planners and managers can manage payments"
  ON public.payments FOR ALL
  USING (
    expense_item_id IN (
      SELECT id FROM public.expense_items 
      WHERE has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
            has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
    )
  );

-- Step 8: Trigger per updated_at su expense_items
CREATE TRIGGER update_expense_items_updated_at
  BEFORE UPDATE ON public.expense_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 9: Trigger per updated_at su payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 10: Indici per performance
CREATE INDEX idx_expense_items_wedding_id ON public.expense_items(wedding_id);
CREATE INDEX idx_expense_items_vendor_id ON public.expense_items(vendor_id);
CREATE INDEX idx_payments_expense_item_id ON public.payments(expense_item_id);
CREATE INDEX idx_payments_due_date ON public.payments(due_date);
CREATE INDEX idx_payments_status ON public.payments(status);