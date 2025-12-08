-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view vendors for accessible weddings" ON public.vendors;

-- Create new restrictive SELECT policy for co_planners and managers only
CREATE POLICY "Co-planners and managers can view vendors" 
ON public.vendors 
FOR SELECT 
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
  has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
);