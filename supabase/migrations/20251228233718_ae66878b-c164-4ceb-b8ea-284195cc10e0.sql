-- Add ceremony start time and timezone to weddings table
ALTER TABLE public.weddings 
ADD COLUMN IF NOT EXISTS ceremony_start_time TIME,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Rome';