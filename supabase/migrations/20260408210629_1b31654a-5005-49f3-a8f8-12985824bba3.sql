-- 1. Add columns to weddings
ALTER TABLE public.weddings
  ADD COLUMN IF NOT EXISTS custom_pdf_template_url text,
  ADD COLUMN IF NOT EXISTS qr_overlay_config jsonb;

-- 2. Create private bucket for invitation designs
INSERT INTO storage.buckets (id, name, public)
VALUES ('invitation-designs', 'invitation-designs', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies
CREATE POLICY "Users can view invitation designs for accessible weddings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invitation-designs'
  AND auth.role() = 'authenticated'
  AND public.has_wedding_access(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Planners can upload invitation designs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invitation-designs'
  AND auth.role() = 'authenticated'
  AND (
    public.has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'co_planner')
    OR public.has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'manager')
    OR public.has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'planner')
  )
);

CREATE POLICY "Planners can update invitation designs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'invitation-designs'
  AND auth.role() = 'authenticated'
  AND (
    public.has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'co_planner')
    OR public.has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'manager')
    OR public.has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'planner')
  )
);

CREATE POLICY "Planners can delete invitation designs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invitation-designs'
  AND auth.role() = 'authenticated'
  AND (
    public.has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'co_planner')
    OR public.has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'manager')
    OR public.has_wedding_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'planner')
  )
);

-- 4. Performance index for funnel dashboard
CREATE INDEX IF NOT EXISTS idx_guests_party_rsvp ON public.guests (party_id, rsvp_status);