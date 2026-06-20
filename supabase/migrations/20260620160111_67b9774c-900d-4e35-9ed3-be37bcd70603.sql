
-- 1. Revoke sensitive Stripe columns on planner_subscriptions from authenticated
REVOKE SELECT (stripe_customer_id, stripe_subscription_id) ON public.planner_subscriptions FROM authenticated;

-- 2. Vendor contracts: drop the broad SELECT policy that includes guests
DROP POLICY IF EXISTS "Users can view contracts for accessible weddings" ON public.vendor_contracts;
-- "Managers can view contracts" and "Planners can manage contracts" remain — covers co_planner/planner/manager only.

-- 3. Vendor communications: split read (any wedding member) vs write (no guests)
DROP POLICY IF EXISTS "Users can manage their wedding communications" ON public.vendor_communications;

CREATE POLICY "Members can view vendor communications"
  ON public.vendor_communications
  FOR SELECT
  TO authenticated
  USING (public.has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Non-guests can write vendor communications"
  ON public.vendor_communications
  FOR ALL
  TO authenticated
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

-- 4. Storage: restrict vendor-contracts file reads to co_planner / planner only
DROP POLICY IF EXISTS "Users can view their wedding contracts" ON storage.objects;

CREATE POLICY "Planners can view wedding contract files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vendor-contracts'
    AND (
      public.has_wedding_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'co_planner'::app_role)
      OR public.has_wedding_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'planner'::app_role)
    )
  );

CREATE POLICY "Planners can upload wedding contract files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-contracts'
    AND (
      public.has_wedding_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'co_planner'::app_role)
      OR public.has_wedding_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'planner'::app_role)
    )
  );
