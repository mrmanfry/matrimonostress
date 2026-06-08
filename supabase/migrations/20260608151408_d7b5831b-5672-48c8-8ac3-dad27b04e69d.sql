
-- 1. Restrict vendor banking/fiscal columns from direct table SELECT
REVOKE SELECT (iban, partita_iva_cf, intestatario_conto, ragione_sociale)
  ON public.vendors FROM authenticated, anon;

-- 2. Restrict wedding Stripe billing identifiers from direct table SELECT
REVOKE SELECT (stripe_customer_id, stripe_subscription_id)
  ON public.weddings FROM authenticated, anon;

-- 3. Tighten storage SELECT policy on camera-photos to only expose approved photos
DROP POLICY IF EXISTS "Public can view photos of active cameras" ON storage.objects;

CREATE POLICY "Public can view approved photos of active cameras"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'camera-photos'
  AND EXISTS (
    SELECT 1
    FROM public.disposable_cameras dc
    JOIN public.camera_photos cp ON cp.camera_id = dc.id
    WHERE dc.is_active = true
      AND cp.is_approved = true
      AND (dc.id)::text = (storage.foldername(objects.name))[1]
      AND cp.file_path = objects.name
  )
);
