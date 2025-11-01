-- Add rsvp_invitation_sent field to guests table for tracking invitation campaign
ALTER TABLE public.guests 
ADD COLUMN rsvp_invitation_sent TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.guests.rsvp_invitation_sent IS 'Timestamp when the RSVP invitation was sent to this guest';