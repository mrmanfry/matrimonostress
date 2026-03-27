
-- Drop the overly permissive self-insert policy
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- Replace with a restrictive policy: only allow insert when a matching accepted invitation exists
CREATE POLICY "Users can insert own role via invitation"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.wedding_invitations wi
    WHERE wi.wedding_id = user_roles.wedding_id
      AND wi.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND wi.status = 'accepted'
  )
);
