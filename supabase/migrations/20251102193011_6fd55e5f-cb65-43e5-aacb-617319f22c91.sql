-- Add staff support to expense_items
ALTER TABLE public.expense_items
ADD COLUMN planned_staff integer DEFAULT 0;

-- Add is_staff flag to guests table
ALTER TABLE public.guests
ADD COLUMN is_staff boolean DEFAULT false;