-- Drop overly permissive RLS policies that expose all guests/parties
DROP POLICY IF EXISTS "Anyone can view guest by valid token" ON public.guests;
DROP POLICY IF EXISTS "Anyone can update RSVP via valid token" ON public.invite_parties;