
ALTER TABLE public.progress_tokens
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'guests',
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS show_location boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_dress_code boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_memories_qr boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_vendor_contacts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_operational_numbers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_addresses boolean NOT NULL DEFAULT true;

ALTER TABLE public.progress_tokens
  DROP CONSTRAINT IF EXISTS progress_tokens_audience_check;
ALTER TABLE public.progress_tokens
  ADD CONSTRAINT progress_tokens_audience_check CHECK (audience IN ('guests','vendors'));

ALTER TABLE public.weddings
  ADD COLUMN IF NOT EXISTS dress_code text,
  ADD COLUMN IF NOT EXISTS logistical_notes text;
