-- 1) Weddings: revoke sensitive Stripe billing columns from client roles
REVOKE SELECT (stripe_customer_id, stripe_subscription_id)
  ON public.weddings FROM anon, authenticated;

-- 2) Vendors: revoke sensitive banking/legal columns from client roles.
-- Co-planners and planners still read these via public.get_vendor_financials (SECURITY DEFINER).
REVOKE SELECT (iban, intestatario_conto, partita_iva_cf, ragione_sociale)
  ON public.vendors FROM anon, authenticated;

-- 3) Realtime: require a wedding UUID in the topic, no generic fallback
CREATE OR REPLACE FUNCTION public.realtime_topic_wedding_access()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_topic text := realtime.topic();
  v_uuid uuid;
  v_match text;
BEGIN
  IF v_topic IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  v_match := (regexp_match(v_topic, '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1];

  -- No UUID in topic = no access. Generic channels are not allowed.
  IF v_match IS NULL THEN
    RETURN false;
  END IF;

  v_uuid := v_match::uuid;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND wedding_id = v_uuid
  );
END;
$function$;