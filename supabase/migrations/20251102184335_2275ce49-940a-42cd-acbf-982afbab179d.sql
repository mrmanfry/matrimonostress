-- Create expense_line_items table for the Smart Expense Sheet
CREATE TABLE public.expense_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_item_id UUID NOT NULL REFERENCES public.expense_items(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  quantity_type TEXT NOT NULL CHECK (quantity_type IN ('fixed', 'adults', 'children', 'total_guests')),
  quantity_fixed INTEGER,
  discount_percentage NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 22,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on expense_line_items
ALTER TABLE public.expense_line_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for expense_line_items
CREATE POLICY "Co-planners and managers can manage line items"
ON public.expense_line_items
FOR ALL
USING (
  expense_item_id IN (
    SELECT ei.id FROM public.expense_items ei
    WHERE has_wedding_role(auth.uid(), ei.wedding_id, 'co_planner'::app_role)
    OR has_wedding_role(auth.uid(), ei.wedding_id, 'manager'::app_role)
  )
);

CREATE POLICY "Users can view line items for accessible expense items"
ON public.expense_line_items
FOR SELECT
USING (
  expense_item_id IN (
    SELECT ei.id FROM public.expense_items ei
    WHERE has_wedding_access(auth.uid(), ei.wedding_id)
  )
);

-- Add calculation mode fields to expense_items
ALTER TABLE public.expense_items 
ADD COLUMN calculation_mode TEXT DEFAULT 'planned' CHECK (calculation_mode IN ('planned', 'actual')),
ADD COLUMN planned_adults INTEGER DEFAULT 100,
ADD COLUMN planned_children INTEGER DEFAULT 0;

-- Add recalculate flag to payments for intelligent saldo
ALTER TABLE public.payments 
ADD COLUMN recalculate_on_actual BOOLEAN DEFAULT false;

-- Create trigger for expense_line_items updated_at
CREATE TRIGGER update_expense_line_items_updated_at
BEFORE UPDATE ON public.expense_line_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_expense_line_items_expense_item_id ON public.expense_line_items(expense_item_id);
CREATE INDEX idx_expense_line_items_order ON public.expense_line_items(expense_item_id, order_index);