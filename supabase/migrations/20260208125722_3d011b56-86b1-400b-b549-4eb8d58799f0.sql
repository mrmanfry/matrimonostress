-- Add venue details fields for formal RSVP invitation
ALTER TABLE public.weddings
ADD COLUMN IF NOT EXISTS ceremony_venue_name TEXT,
ADD COLUMN IF NOT EXISTS ceremony_venue_address TEXT,
ADD COLUMN IF NOT EXISTS reception_venue_name TEXT,
ADD COLUMN IF NOT EXISTS reception_venue_address TEXT,
ADD COLUMN IF NOT EXISTS reception_start_time TIME WITHOUT TIME ZONE;