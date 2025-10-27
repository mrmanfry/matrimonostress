-- Create table for sync tokens (temporary, secure)
CREATE TABLE IF NOT EXISTS public.sync_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  wedding_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for token lookup
CREATE INDEX idx_sync_tokens_token ON public.sync_tokens(token);
CREATE INDEX idx_sync_tokens_user ON public.sync_tokens(user_id);
CREATE INDEX idx_sync_tokens_expires ON public.sync_tokens(expires_at) WHERE NOT used;

-- Enable RLS
ALTER TABLE public.sync_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own tokens
CREATE POLICY "Users can view their own sync tokens"
ON public.sync_tokens FOR SELECT
USING (auth.uid() = user_id);

-- Policy: users can create their own tokens
CREATE POLICY "Users can create their own sync tokens"
ON public.sync_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create table for temporary contact matches (session-based)
CREATE TABLE IF NOT EXISTS public.contact_matches_temp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wedding_id UUID NOT NULL,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  contact_name TEXT,
  contact_phone TEXT,
  confidence_score INTEGER, -- 0-100
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, skipped
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Create indexes
CREATE INDEX idx_contact_matches_user_wedding ON public.contact_matches_temp(user_id, wedding_id);
CREATE INDEX idx_contact_matches_guest ON public.contact_matches_temp(guest_id);

-- Enable RLS
ALTER TABLE public.contact_matches_temp ENABLE ROW LEVEL SECURITY;

-- Policy: users can view their own matches
CREATE POLICY "Users can view their own contact matches"
ON public.contact_matches_temp FOR SELECT
USING (auth.uid() = user_id);

-- Policy: users can insert their own matches
CREATE POLICY "Users can insert their own contact matches"
ON public.contact_matches_temp FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: users can update their own matches
CREATE POLICY "Users can update their own contact matches"
ON public.contact_matches_temp FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: users can delete their own matches
CREATE POLICY "Users can delete their own contact matches"
ON public.contact_matches_temp FOR DELETE
USING (auth.uid() = user_id);

-- Function to cleanup expired tokens (can be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_sync_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sync_tokens 
  WHERE expires_at < now() OR (used = true AND created_at < now() - interval '1 hour');
  
  DELETE FROM public.contact_matches_temp
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;