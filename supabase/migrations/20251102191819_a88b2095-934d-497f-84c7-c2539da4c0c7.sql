-- Add quantity range fields to expense_line_items
ALTER TABLE public.expense_line_items
ADD COLUMN quantity_limit integer,
ADD COLUMN quantity_range text DEFAULT 'all' CHECK (quantity_range IN ('all', 'up_to', 'over'));