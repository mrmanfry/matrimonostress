-- Add is_couple_member column to guests table
ALTER TABLE public.guests 
ADD COLUMN is_couple_member boolean NOT NULL DEFAULT false;

-- Add index for faster queries
CREATE INDEX idx_guests_is_couple_member ON public.guests(wedding_id, is_couple_member) WHERE is_couple_member = true;