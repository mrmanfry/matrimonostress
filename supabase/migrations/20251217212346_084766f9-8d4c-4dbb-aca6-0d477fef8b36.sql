-- Fix: guest_phone_broad_access
-- Drop the overly permissive SELECT policy that allows all wedding roles to see guest phone numbers
DROP POLICY IF EXISTS "Users can view guests for accessible weddings" ON guests;

-- Create new policy: Only co-planners and managers can view full guest data (including phone numbers)
CREATE POLICY "Co-planners and managers can view guests"
  ON guests FOR SELECT
  USING (
    has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
    OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
  );