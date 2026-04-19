-- ============================================================
-- FIX 1: camera_participants anon SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Anon can read camera participants" ON public.camera_participants;

CREATE POLICY "Anon can read camera participants for active cameras"
  ON public.camera_participants
  FOR SELECT
  TO anon
  USING (
    camera_id IN (
      SELECT id FROM public.disposable_cameras WHERE is_active = true
    )
  );

-- ============================================================
-- FIX 2: vendor-documents storage policies path validation
-- ============================================================
DROP POLICY IF EXISTS "Users can upload vendor documents for their weddings" ON storage.objects;
DROP POLICY IF EXISTS "Co-planners can delete vendor documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view vendor documents for their weddings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update vendor documents for their weddings" ON storage.objects;

-- SELECT: any wedding member can view documents in their wedding's vendor folders
CREATE POLICY "Users can view vendor documents for their weddings"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vendor-documents' AND
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE (v.id)::text = (storage.foldername(objects.name))[2]
        AND public.has_wedding_access(auth.uid(), v.wedding_id)
    )
  );

-- INSERT: planners/managers can upload to {wedding_id}/{vendor_id}/ paths only
CREATE POLICY "Users can upload vendor documents for their weddings"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-documents' AND
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE (v.id)::text = (storage.foldername(objects.name))[2]
        AND (
          public.has_wedding_role(auth.uid(), v.wedding_id, 'co_planner'::app_role) OR
          public.has_wedding_role(auth.uid(), v.wedding_id, 'manager'::app_role) OR
          public.has_wedding_role(auth.uid(), v.wedding_id, 'planner'::app_role)
        )
    )
  );

-- UPDATE: same scoping as upload
CREATE POLICY "Users can update vendor documents for their weddings"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vendor-documents' AND
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE (v.id)::text = (storage.foldername(objects.name))[2]
        AND (
          public.has_wedding_role(auth.uid(), v.wedding_id, 'co_planner'::app_role) OR
          public.has_wedding_role(auth.uid(), v.wedding_id, 'manager'::app_role) OR
          public.has_wedding_role(auth.uid(), v.wedding_id, 'planner'::app_role)
        )
    )
  );

-- DELETE: only co-planners and planners
CREATE POLICY "Co-planners can delete vendor documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vendor-documents' AND
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE (v.id)::text = (storage.foldername(objects.name))[2]
        AND (
          public.has_wedding_role(auth.uid(), v.wedding_id, 'co_planner'::app_role) OR
          public.has_wedding_role(auth.uid(), v.wedding_id, 'planner'::app_role)
        )
    )
  );