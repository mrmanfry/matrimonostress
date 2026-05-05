
-- =========================================================================
-- 1) vendors: nascondi dati bancari/fiscali ai ruoli != co_planner/planner
-- =========================================================================
REVOKE SELECT (iban, intestatario_conto, partita_iva_cf, ragione_sociale)
  ON public.vendors FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_vendor_financials(p_vendor_id uuid)
RETURNS TABLE (
  iban text,
  intestatario_conto text,
  partita_iva_cf text,
  ragione_sociale text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wedding uuid;
BEGIN
  SELECT wedding_id INTO v_wedding FROM public.vendors WHERE id = p_vendor_id;
  IF v_wedding IS NULL THEN
    RETURN;
  END IF;
  IF NOT (
    public.has_wedding_role(auth.uid(), v_wedding, 'co_planner'::app_role)
    OR public.has_wedding_role(auth.uid(), v_wedding, 'planner'::app_role)
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT v.iban, v.intestatario_conto, v.partita_iva_cf, v.ragione_sociale
    FROM public.vendors v WHERE v.id = p_vendor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vendor_financials(uuid) TO authenticated;

-- =========================================================================
-- 2) weddings: nascondi identificativi di fatturazione/notifiche partner
-- =========================================================================
REVOKE SELECT (stripe_customer_id, stripe_subscription_id, partner_unlocked_email)
  ON public.weddings FROM anon, authenticated;

-- =========================================================================
-- 3) disposable_cameras: rimuovi anon SELECT broad, esponi RPC by token
-- =========================================================================
DROP POLICY IF EXISTS "Anon can read camera by token" ON public.disposable_cameras;

CREATE OR REPLACE FUNCTION public.get_camera_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  wedding_id uuid,
  token text,
  is_active boolean,
  film_type text,
  shots_per_person integer,
  hard_storage_limit integer,
  free_reveal_limit integer,
  unlocked_photo_limit integer,
  reveal_mode text,
  reveal_at timestamptz,
  ending_date timestamptz,
  require_approval boolean,
  poster_design jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, wedding_id, token, is_active, film_type, shots_per_person,
         hard_storage_limit, free_reveal_limit, unlocked_photo_limit,
         reveal_mode, reveal_at, ending_date, require_approval, poster_design,
         created_at, updated_at
  FROM public.disposable_cameras
  WHERE token = p_token AND is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_camera_by_token(text) TO anon, authenticated;

-- =========================================================================
-- 4) camera_photos: rimuovi anon SELECT broad, RPC scoped by token+fingerprint
-- =========================================================================
DROP POLICY IF EXISTS "Anon can read camera photos for active cameras" ON public.camera_photos;

CREATE OR REPLACE FUNCTION public.get_camera_photos_by_token(
  p_token text,
  p_fingerprint text
)
RETURNS TABLE (
  id uuid,
  camera_id uuid,
  file_path text,
  guest_name text,
  guest_fingerprint text,
  film_type_applied text,
  is_approved boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.id, cp.camera_id, cp.file_path, cp.guest_name, cp.guest_fingerprint,
         cp.film_type_applied, cp.is_approved, cp.created_at
  FROM public.camera_photos cp
  JOIN public.disposable_cameras dc ON dc.id = cp.camera_id
  WHERE dc.token = p_token
    AND dc.is_active = true
    AND cp.guest_fingerprint = p_fingerprint
    AND cp.is_approved = true
  ORDER BY cp.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_camera_photos_by_token(text, text) TO anon, authenticated;
