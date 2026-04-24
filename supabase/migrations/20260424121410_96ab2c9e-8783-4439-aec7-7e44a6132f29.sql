-- 1. Rimuove la policy difettosa sulla tabella weddings.
-- La condizione "dc.wedding_id = dc.id" era un bug: praticamente sempre falsa,
-- ma la presenza stessa della policy PERMISSIVE permetteva la valutazione della tabella
-- agli utenti anon. Per i dati pubblici della fotocamera esiste già la vista
-- public.weddings_camera_public che espone solo i campi necessari.
DROP POLICY IF EXISTS "Anon can read weddings with active camera" ON public.weddings;

-- 2. Sostituisce la policy SELECT pubblica troppo permissiva sul bucket camera-photos.
-- Ora la lettura pubblica è consentita SOLO se il primo segmento del path
-- (la cartella, che corrisponde all'id della fotocamera) appartiene a una
-- disposable_camera attiva.
DROP POLICY IF EXISTS "Public can view camera photos" ON storage.objects;

CREATE POLICY "Public can view photos of active cameras"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'camera-photos'
  AND EXISTS (
    SELECT 1
    FROM public.disposable_cameras dc
    WHERE dc.is_active = true
      AND dc.id::text = (storage.foldername(name))[1]
  )
);