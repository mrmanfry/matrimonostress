
CREATE TABLE public.tableau_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL UNIQUE REFERENCES public.weddings(id) ON DELETE CASCADE,
  background_path text,
  width_cm numeric NOT NULL DEFAULT 70,
  height_cm numeric NOT NULL DEFAULT 100,
  orientation text NOT NULL DEFAULT 'portrait',
  style jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocks jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','frozen')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tableau_layouts TO authenticated;
GRANT ALL ON public.tableau_layouts TO service_role;

ALTER TABLE public.tableau_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborators can view tableau layouts"
  ON public.tableau_layouts FOR SELECT TO authenticated
  USING (public.has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Collaborators can insert tableau layouts"
  ON public.tableau_layouts FOR INSERT TO authenticated
  WITH CHECK (public.has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Collaborators can update tableau layouts"
  ON public.tableau_layouts FOR UPDATE TO authenticated
  USING (public.has_wedding_access(auth.uid(), wedding_id))
  WITH CHECK (public.has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Collaborators can delete tableau layouts"
  ON public.tableau_layouts FOR DELETE TO authenticated
  USING (public.has_wedding_access(auth.uid(), wedding_id));

CREATE TRIGGER update_tableau_layouts_updated_at
  BEFORE UPDATE ON public.tableau_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage RLS for tableau-backgrounds bucket (bucket created via tool)
CREATE POLICY "Collaborators can view tableau backgrounds"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tableau-backgrounds'
    AND public.has_wedding_access(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Collaborators can upload tableau backgrounds"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tableau-backgrounds'
    AND public.has_wedding_access(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Collaborators can update tableau backgrounds"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tableau-backgrounds'
    AND public.has_wedding_access(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Collaborators can delete tableau backgrounds"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tableau-backgrounds'
    AND public.has_wedding_access(auth.uid(), (storage.foldername(name))[1]::uuid)
  );
