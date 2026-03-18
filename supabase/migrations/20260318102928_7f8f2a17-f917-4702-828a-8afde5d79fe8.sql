
-- 1. Create disposable_cameras table
CREATE TABLE public.disposable_cameras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL UNIQUE REFERENCES public.weddings(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT LOWER(REPLACE(gen_random_uuid()::TEXT, '-', '')),
  ending_date timestamptz,
  reveal_mode text NOT NULL DEFAULT 'after_event',
  reveal_at timestamptz,
  shots_per_person integer NOT NULL DEFAULT 27,
  free_reveal_limit integer NOT NULL DEFAULT 100,
  hard_storage_limit integer NOT NULL DEFAULT 500,
  film_type text NOT NULL DEFAULT 'vintage',
  is_active boolean NOT NULL DEFAULT true,
  require_approval boolean NOT NULL DEFAULT false,
  photos_unlocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create camera_photos table
CREATE TABLE public.camera_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id uuid NOT NULL REFERENCES public.disposable_cameras(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  guest_name text,
  guest_fingerprint text,
  film_type_applied text,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create camera_participants table
CREATE TABLE public.camera_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id uuid NOT NULL REFERENCES public.disposable_cameras(id) ON DELETE CASCADE,
  guest_name text,
  guest_fingerprint text NOT NULL,
  shots_taken integer NOT NULL DEFAULT 0,
  notify_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(camera_id, guest_fingerprint)
);

-- 4. Create indexes
CREATE INDEX idx_camera_photos_camera_id ON public.camera_photos(camera_id);
CREATE INDEX idx_camera_participants_camera_id ON public.camera_participants(camera_id);
CREATE INDEX idx_disposable_cameras_token ON public.disposable_cameras(token);

-- 5. Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('camera-photos', 'camera-photos', true);

-- 6. Storage policies: public read
CREATE POLICY "Public can view camera photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'camera-photos');

-- 7. Storage policies: service role write (Edge Function uses service role, no policy needed for anon write)

-- 8. RLS on disposable_cameras
ALTER TABLE public.disposable_cameras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planners can manage cameras"
ON public.disposable_cameras FOR ALL
TO authenticated
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
  OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
  OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role)
);

CREATE POLICY "Users can view cameras for accessible weddings"
ON public.disposable_cameras FOR SELECT
TO authenticated
USING (has_wedding_access(auth.uid(), wedding_id));

-- 9. RLS on camera_photos
ALTER TABLE public.camera_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planners can manage camera photos"
ON public.camera_photos FOR ALL
TO authenticated
USING (
  camera_id IN (
    SELECT id FROM public.disposable_cameras
    WHERE has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
      OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
      OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role)
  )
);

CREATE POLICY "Users can view camera photos for accessible weddings"
ON public.camera_photos FOR SELECT
TO authenticated
USING (
  camera_id IN (
    SELECT id FROM public.disposable_cameras
    WHERE has_wedding_access(auth.uid(), wedding_id)
  )
);

-- 10. RLS on camera_participants
ALTER TABLE public.camera_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planners can manage camera participants"
ON public.camera_participants FOR ALL
TO authenticated
USING (
  camera_id IN (
    SELECT id FROM public.disposable_cameras
    WHERE has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
      OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
      OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role)
  )
);

CREATE POLICY "Users can view camera participants for accessible weddings"
ON public.camera_participants FOR SELECT
TO authenticated
USING (
  camera_id IN (
    SELECT id FROM public.disposable_cameras
    WHERE has_wedding_access(auth.uid(), wedding_id)
  )
);

-- 11. updated_at trigger for disposable_cameras
CREATE TRIGGER update_disposable_cameras_updated_at
  BEFORE UPDATE ON public.disposable_cameras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
