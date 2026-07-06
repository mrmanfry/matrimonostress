
-- 1. wedding_invitations: restrict UPDATE to status pending->accepted only
DROP POLICY IF EXISTS "Users can update their own invitations" ON public.wedding_invitations;
CREATE POLICY "Invitees can accept their own invitations"
  ON public.wedding_invitations
  FOR UPDATE
  USING (email = public.get_user_email(auth.uid()) AND status = 'pending')
  WITH CHECK (
    email = public.get_user_email(auth.uid())
    AND status = 'accepted'
  );

-- 2. user_roles: require invitation role to match inserted role
DROP POLICY IF EXISTS "Users can insert own role via invitation" ON public.user_roles;
CREATE POLICY "Users can insert own role via invitation"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.wedding_invitations wi
      WHERE wi.wedding_id = user_roles.wedding_id
        AND wi.email = public.get_user_email(auth.uid())
        AND wi.status = 'accepted'
        AND wi.role = user_roles.role
    )
  );

-- 3. sync_tokens: require wedding access on INSERT
DROP POLICY IF EXISTS "Users can create their own sync tokens" ON public.sync_tokens;
CREATE POLICY "Users can create their own sync tokens"
  ON public.sync_tokens
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_wedding_access(auth.uid(), wedding_id)
  );

-- 4. planner_subscriptions: revoke SELECT on stripe id columns
REVOKE SELECT (stripe_customer_id, stripe_subscription_id)
  ON public.planner_subscriptions FROM authenticated, anon;

-- 5. weddings: revoke UPDATE on stripe id columns from authenticated
REVOKE UPDATE (stripe_customer_id, stripe_subscription_id, current_period_end, subscription_status)
  ON public.weddings FROM authenticated, anon;

-- 6. tableau_layouts: restrict writes to planners/managers
DROP POLICY IF EXISTS "Collaborators can insert tableau layouts" ON public.tableau_layouts;
DROP POLICY IF EXISTS "Collaborators can update tableau layouts" ON public.tableau_layouts;
DROP POLICY IF EXISTS "Collaborators can delete tableau layouts" ON public.tableau_layouts;

CREATE POLICY "Planners and managers can insert tableau layouts"
  ON public.tableau_layouts
  FOR INSERT
  WITH CHECK (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
    OR public.has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role)
    OR public.has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
  );
CREATE POLICY "Planners and managers can update tableau layouts"
  ON public.tableau_layouts
  FOR UPDATE
  USING (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
    OR public.has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role)
    OR public.has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
  )
  WITH CHECK (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
    OR public.has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role)
    OR public.has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
  );
CREATE POLICY "Planners and managers can delete tableau layouts"
  ON public.tableau_layouts
  FOR DELETE
  USING (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
    OR public.has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role)
    OR public.has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
  );

-- 7. vendor_contracts: remove manager SELECT policy
DROP POLICY IF EXISTS "Managers can view contracts" ON public.vendor_contracts;
