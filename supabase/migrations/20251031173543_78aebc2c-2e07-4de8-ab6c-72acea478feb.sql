-- Allow authenticated users to view weddings when searching by access code
-- This enables the "join wedding" flow where new users need to find the wedding
-- before they have a role assigned
CREATE POLICY "Users can view weddings by access code"
ON public.weddings
FOR SELECT
TO authenticated
USING (access_code IS NOT NULL);