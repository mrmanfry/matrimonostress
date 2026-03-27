
-- Recreate view with security_invoker = on
DROP VIEW IF EXISTS public.weddings_camera_public;

CREATE VIEW public.weddings_camera_public
WITH (security_invoker = on) AS
SELECT w.id, w.partner1_name, w.partner2_name, w.wedding_date
FROM public.weddings w
WHERE EXISTS (
  SELECT 1 FROM public.disposable_cameras dc
  WHERE dc.wedding_id = w.id AND dc.is_active = true
);

GRANT SELECT ON public.weddings_camera_public TO anon;

-- Add scoped anon policy on weddings (only rows with active cameras, replaces the old USING(true))
CREATE POLICY "Anon can read weddings with active camera"
ON public.weddings
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.disposable_cameras dc
    WHERE dc.wedding_id = id AND dc.is_active = true
  )
);
