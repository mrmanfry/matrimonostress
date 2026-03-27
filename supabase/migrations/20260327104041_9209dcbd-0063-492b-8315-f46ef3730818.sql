
-- Create a minimal view for anonymous camera access
CREATE VIEW public.weddings_camera_public
WITH (security_invoker = off) AS
SELECT w.id, w.partner1_name, w.partner2_name, w.wedding_date
FROM public.weddings w
WHERE EXISTS (
  SELECT 1 FROM public.disposable_cameras dc
  WHERE dc.wedding_id = w.id AND dc.is_active = true
);

-- Grant anon access to the view
GRANT SELECT ON public.weddings_camera_public TO anon;

-- Drop the overly permissive anon policy
DROP POLICY IF EXISTS "Anon can read wedding names for camera" ON public.weddings;
