-- Add dietary preference count columns to vendors table
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS staff_vegan_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS staff_vegetarian_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS staff_gluten_free_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS staff_lactose_free_count integer DEFAULT 0;