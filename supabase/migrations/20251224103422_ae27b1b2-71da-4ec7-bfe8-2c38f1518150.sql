-- Add location field to weddings table
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS location text;