ALTER TABLE public.disposable_cameras ADD COLUMN unlocked_photo_limit integer NOT NULL DEFAULT 150;
ALTER TABLE public.disposable_cameras ALTER COLUMN free_reveal_limit SET DEFAULT 150;
ALTER TABLE public.disposable_cameras ALTER COLUMN hard_storage_limit SET DEFAULT 2500;
UPDATE public.disposable_cameras SET free_reveal_limit = 150, hard_storage_limit = 2500, unlocked_photo_limit = 150;
UPDATE public.disposable_cameras SET unlocked_photo_limit = 2500 WHERE photos_unlocked = true;
ALTER TABLE public.disposable_cameras DROP COLUMN photos_unlocked;