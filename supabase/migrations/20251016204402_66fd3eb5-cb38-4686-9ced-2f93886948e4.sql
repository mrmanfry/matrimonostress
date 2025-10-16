-- Fix weddings RLS policy to allow creator to see their wedding immediately
DROP POLICY IF EXISTS "Users can view weddings they have access to" ON public.weddings;

-- Allow users to view weddings they created OR have access to
CREATE POLICY "Users can view weddings they have access to"
ON public.weddings
FOR SELECT
USING (
  auth.uid() = created_by 
  OR has_wedding_access(auth.uid(), id)
);