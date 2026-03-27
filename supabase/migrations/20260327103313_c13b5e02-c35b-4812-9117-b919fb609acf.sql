
-- Drop the overly permissive anon policy
DROP POLICY IF EXISTS "Anon can read camera photos" ON public.camera_photos;

-- Create a scoped policy: anon can only read photos from active cameras
CREATE POLICY "Anon can read camera photos for active cameras"
ON public.camera_photos
FOR SELECT
TO anon
USING (
  camera_id IN (
    SELECT id FROM public.disposable_cameras WHERE is_active = true
  )
);
