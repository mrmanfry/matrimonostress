-- Permetti la lettura degli inviti tramite token (anche per utenti non autenticati)
CREATE POLICY "Anyone can view invitations with valid token"
ON public.wedding_invitations
FOR SELECT
TO public
USING (
  status = 'pending' 
  AND expires_at > now()
  AND token IS NOT NULL
);