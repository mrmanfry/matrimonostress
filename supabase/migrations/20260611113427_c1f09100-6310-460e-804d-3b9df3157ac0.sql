
-- 1. Vendors: revoke column-level SELECT on banking/fiscal fields from authenticated.
-- Sensitive vendor financial data must only be accessed via get_vendor_financials() RPC,
-- which enforces co_planner/planner role checks. service_role retains access for edge functions.
REVOKE SELECT (iban, partita_iva_cf, intestatario_conto, ragione_sociale)
  ON public.vendors FROM authenticated;

-- 2. Weddings: revoke column-level SELECT on Stripe billing IDs from authenticated.
-- These are only needed in edge functions (check-subscription, customer-portal, payments-webhook)
-- which run with service_role and bypass column-level grants.
REVOKE SELECT (stripe_customer_id, stripe_subscription_id)
  ON public.weddings FROM authenticated;

-- 3. vendor-contracts storage bucket: add explicit UPDATE policy restricted to co_planner
-- to make intent clear and prevent future accidental broad UPDATE policies.
CREATE POLICY "Co-planners can update contracts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vendor-contracts'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.wedding_id = ((storage.foldername(objects.name))[1])::uuid
      AND user_roles.role = 'co_planner'::app_role
  )
)
WITH CHECK (
  bucket_id = 'vendor-contracts'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.wedding_id = ((storage.foldername(objects.name))[1])::uuid
      AND user_roles.role = 'co_planner'::app_role
  )
);
