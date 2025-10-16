-- Permetti agli utenti invitati di aggiornare il proprio invito (per accettarlo)
CREATE POLICY "Users can update their own invitations"
ON public.wedding_invitations
FOR UPDATE
TO authenticated
USING (email = auth.jwt()->>'email')
WITH CHECK (email = auth.jwt()->>'email');