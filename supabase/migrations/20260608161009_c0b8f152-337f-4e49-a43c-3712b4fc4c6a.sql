
-- Revoke column-level SELECT on sensitive vendor fields from authenticated
-- Co-planners and planners must use get_vendor_financials() RPC
REVOKE SELECT (iban, partita_iva_cf, intestatario_conto, ragione_sociale)
  ON public.vendors FROM authenticated;

-- Revoke column-level SELECT on Stripe billing IDs from authenticated
-- Edge functions use service_role and remain unaffected
REVOKE SELECT (stripe_customer_id, stripe_subscription_id)
  ON public.weddings FROM authenticated;
