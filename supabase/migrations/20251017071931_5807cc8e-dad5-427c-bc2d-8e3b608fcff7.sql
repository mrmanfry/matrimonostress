-- Drop the existing problematic SELECT policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles for weddings they have access to" ON public.user_roles;

-- Create a new simplified SELECT policy that only checks user_id
-- This eliminates the circular dependency with has_wedding_access()
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);