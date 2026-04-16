ALTER TABLE public.guests 
  ADD COLUMN plus_one_of_guest_id UUID NULL 
  REFERENCES public.guests(id) ON DELETE SET NULL;

CREATE INDEX idx_guests_plus_one_of ON public.guests(plus_one_of_guest_id);