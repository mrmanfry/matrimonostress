
-- 1. Add print_design JSONB column to weddings
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS print_design jsonb DEFAULT NULL;

-- 2. Create print-assets storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('print-assets', 'print-assets', false)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies for print-assets bucket
CREATE POLICY "Planners can upload print assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'print-assets'
  AND (
    has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'co_planner'::app_role)
    OR has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'planner'::app_role)
  )
);

CREATE POLICY "Planners can view print assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'print-assets'
  AND has_wedding_access(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Planners can delete print assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'print-assets'
  AND (
    has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'co_planner'::app_role)
    OR has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'planner'::app_role)
  )
);
