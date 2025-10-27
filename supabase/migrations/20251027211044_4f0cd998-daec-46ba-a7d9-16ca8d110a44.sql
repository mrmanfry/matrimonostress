-- Add phone column to guests table
ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS phone TEXT;