
-- Indexes for camera tables performance
CREATE INDEX IF NOT EXISTS idx_camera_photos_camera_id ON public.camera_photos(camera_id);
CREATE INDEX IF NOT EXISTS idx_camera_participants_camera_fingerprint ON public.camera_participants(camera_id, guest_fingerprint);

-- Atomic function to upload a photo: checks limits and increments shots in a single transaction
CREATE OR REPLACE FUNCTION public.camera_upload_photo(
  p_camera_id uuid,
  p_fingerprint text,
  p_file_path text,
  p_guest_name text DEFAULT NULL,
  p_film_type text DEFAULT NULL,
  p_require_approval boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_shots_per_person integer;
  v_hard_limit integer;
  v_current_shots integer;
  v_total_photos integer;
  v_photo_id uuid;
BEGIN
  -- Get camera limits (lock row to prevent concurrent reads)
  SELECT shots_per_person, hard_storage_limit
  INTO v_shots_per_person, v_hard_limit
  FROM public.disposable_cameras
  WHERE id = p_camera_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_camera');
  END IF;

  -- Count total photos atomically
  SELECT COUNT(*) INTO v_total_photos
  FROM public.camera_photos
  WHERE camera_id = p_camera_id;

  IF v_total_photos >= v_hard_limit THEN
    RETURN jsonb_build_object('error', 'film_full', 'shots_remaining', 0);
  END IF;

  -- Get or create participant with row lock
  SELECT shots_taken INTO v_current_shots
  FROM public.camera_participants
  WHERE camera_id = p_camera_id AND guest_fingerprint = p_fingerprint
  FOR UPDATE;

  IF NOT FOUND THEN
    v_current_shots := 0;
    INSERT INTO public.camera_participants (camera_id, guest_fingerprint, guest_name, shots_taken)
    VALUES (p_camera_id, p_fingerprint, p_guest_name, 0);
  END IF;

  IF v_current_shots >= v_shots_per_person THEN
    RETURN jsonb_build_object('error', 'shots_exhausted', 'shots_remaining', 0);
  END IF;

  -- Insert photo
  INSERT INTO public.camera_photos (camera_id, file_path, guest_name, guest_fingerprint, film_type_applied, is_approved)
  VALUES (p_camera_id, p_file_path, p_guest_name, p_fingerprint, p_film_type, NOT p_require_approval)
  RETURNING id INTO v_photo_id;

  -- Increment shots atomically
  UPDATE public.camera_participants
  SET shots_taken = shots_taken + 1,
      guest_name = COALESCE(p_guest_name, guest_name)
  WHERE camera_id = p_camera_id AND guest_fingerprint = p_fingerprint;

  RETURN jsonb_build_object(
    'success', true,
    'photo_id', v_photo_id,
    'shots_remaining', v_shots_per_person - (v_current_shots + 1)
  );
END;
$$;
