-- 1. Anon can read active cameras by token
CREATE POLICY "Anon can read camera by token"
  ON public.disposable_cameras FOR SELECT
  TO anon
  USING (is_active = true);

-- 2. Anon can read camera photos
CREATE POLICY "Anon can read camera photos"
  ON public.camera_photos FOR SELECT
  TO anon
  USING (true);

-- 3. Anon can read camera participants
CREATE POLICY "Anon can read camera participants"
  ON public.camera_participants FOR SELECT
  TO anon
  USING (true);

-- 4. Anon can read wedding names for camera hero
CREATE POLICY "Anon can read wedding names for camera"
  ON public.weddings FOR SELECT
  TO anon
  USING (true);