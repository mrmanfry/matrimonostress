
-- Add missing FK with CASCADE for tables that reference weddings but lack it

ALTER TABLE public.tables
  ADD CONSTRAINT tables_wedding_id_fkey
  FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE;

ALTER TABLE public.timeline_events
  ADD CONSTRAINT timeline_events_wedding_id_fkey
  FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE;

ALTER TABLE public.timeline_tokens
  ADD CONSTRAINT timeline_tokens_wedding_id_fkey
  FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE;

ALTER TABLE public.financial_contributors
  ADD CONSTRAINT financial_contributors_wedding_id_fkey
  FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE;

ALTER TABLE public.sync_tokens
  ADD CONSTRAINT sync_tokens_wedding_id_fkey
  FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE;

-- Add DELETE policy on profiles so edge function can clean up
CREATE POLICY "Users can delete their own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);
