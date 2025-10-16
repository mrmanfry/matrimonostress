-- Crea bucket per documenti fornitori
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-documents',
  'vendor-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp']
);

-- Policy: Users can upload documents for vendors in their weddings
CREATE POLICY "Users can upload vendor documents for their weddings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'vendor-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id::text = (storage.foldername(name))[2]
      AND has_wedding_access(auth.uid(), v.wedding_id)
  )
);

-- Policy: Users can view vendor documents for their weddings
CREATE POLICY "Users can view vendor documents for their weddings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'vendor-documents'
  AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id::text = (storage.foldername(name))[2]
      AND has_wedding_access(auth.uid(), v.wedding_id)
  )
);

-- Policy: Co-planners and managers can delete vendor documents
CREATE POLICY "Co-planners can delete vendor documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'vendor-documents'
  AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id::text = (storage.foldername(name))[2]
      AND (
        has_wedding_role(auth.uid(), v.wedding_id, 'co_planner'::app_role)
        OR has_wedding_role(auth.uid(), v.wedding_id, 'manager'::app_role)
      )
  )
);