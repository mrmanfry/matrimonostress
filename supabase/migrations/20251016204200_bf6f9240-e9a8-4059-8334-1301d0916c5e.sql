-- Fix circular dependency in user_roles RLS policies
-- Allow users to assign themselves roles when creating a wedding

DROP POLICY IF EXISTS "Only co-planners can manage roles" ON public.user_roles;

-- New policy: Users can insert their own role
CREATE POLICY "Users can insert their own role"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Co-planners can manage other users' roles
CREATE POLICY "Co-planners can manage other roles"
ON public.user_roles
FOR ALL
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
  AND auth.uid() != user_id
);

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR has_wedding_access(auth.uid(), wedding_id));