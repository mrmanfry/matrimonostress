GRANT SELECT ON public.progress_tokens TO anon;

CREATE POLICY "Anyone can view active progress tokens"
  ON public.progress_tokens FOR SELECT
  TO anon
  USING (is_active = true AND expires_at > now());