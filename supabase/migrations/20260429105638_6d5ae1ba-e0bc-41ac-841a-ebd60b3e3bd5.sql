-- Fix FK constraints on invite_parties to allow guest deletion
ALTER TABLE public.invite_parties
  DROP CONSTRAINT IF EXISTS invite_parties_last_updated_by_guest_id_fkey;

ALTER TABLE public.invite_parties
  ADD CONSTRAINT invite_parties_last_updated_by_guest_id_fkey
  FOREIGN KEY (last_updated_by_guest_id)
  REFERENCES public.guests(id)
  ON DELETE SET NULL;

ALTER TABLE public.invite_parties
  DROP CONSTRAINT IF EXISTS invite_parties_confirmed_by_guest_id_fkey;

ALTER TABLE public.invite_parties
  ADD CONSTRAINT invite_parties_confirmed_by_guest_id_fkey
  FOREIGN KEY (confirmed_by_guest_id)
  REFERENCES public.guests(id)
  ON DELETE SET NULL;