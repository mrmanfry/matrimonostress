-- Rimuovi la policy precedente
DROP POLICY IF EXISTS "Users can update their own invitations" ON public.wedding_invitations;

-- Crea una policy più semplice per permettere l'update degli inviti
CREATE POLICY "Users can update their own invitations"
ON public.wedding_invitations
FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));