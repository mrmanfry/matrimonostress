-- =====================================================
-- 1) CAMERA_PARTICIPANTS: rimuovere esposizione anon
-- =====================================================

DROP POLICY IF EXISTS "Anon can read camera participants for active cameras" ON public.camera_participants;

-- Funzione pubblica: solo conteggio partecipanti per camera attiva via token
CREATE OR REPLACE FUNCTION public.get_camera_participant_count(p_token text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.camera_participants cp
  JOIN public.disposable_cameras dc ON dc.id = cp.camera_id
  WHERE dc.token = p_token AND dc.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_camera_participant_count(text) TO anon, authenticated;

-- Funzione per aggiornare email notifica del proprio fingerprint
CREATE OR REPLACE FUNCTION public.update_camera_participant_email(
  p_token text,
  p_fingerprint text,
  p_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_camera_id uuid;
BEGIN
  SELECT id INTO v_camera_id
  FROM public.disposable_cameras
  WHERE token = p_token AND is_active = true;

  IF v_camera_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.camera_participants
  SET notify_email = NULLIF(TRIM(p_email), '')
  WHERE camera_id = v_camera_id
    AND guest_fingerprint = p_fingerprint;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_camera_participant_email(text, text, text) TO anon, authenticated;

-- =====================================================
-- 2) REALTIME: policy su realtime.messages per scope canali
-- =====================================================

-- Abilita RLS su realtime.messages (idempotente)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop precedenti policy se esistono
DROP POLICY IF EXISTS "Authenticated users subscribe to their wedding channels" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users broadcast to their wedding channels" ON realtime.messages;

-- Helper: estrae UUID dal topic (es. "chat-<uuid>", "inbox-<uuid>", "unread-badge", "planner-cockpit-tasks")
-- Solo i topic che terminano con un UUID valido di un wedding accessibile sono ammessi.
CREATE OR REPLACE FUNCTION public.realtime_topic_wedding_access()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic text := realtime.topic();
  v_uuid uuid;
  v_match text;
BEGIN
  IF v_topic IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Cerca un UUID nel topic
  v_match := (regexp_match(v_topic, '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1];

  IF v_match IS NULL THEN
    -- Topic senza UUID (es. canali generici planner): consenti se utente è planner di almeno un matrimonio
    RETURN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('planner', 'co_planner', 'manager')
    );
  END IF;

  v_uuid := v_match::uuid;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND wedding_id = v_uuid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.realtime_topic_wedding_access() TO authenticated;

-- Policy: SELECT (sottoscrizione) ai canali relativi al proprio wedding
CREATE POLICY "Authenticated users subscribe to their wedding channels"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (public.realtime_topic_wedding_access());

-- Policy: INSERT (broadcast) ai canali del proprio wedding
CREATE POLICY "Authenticated users broadcast to their wedding channels"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.realtime_topic_wedding_access());