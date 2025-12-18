-- Add foreign key constraint from guests.party_id to invite_parties.id
ALTER TABLE public.guests 
ADD CONSTRAINT fk_guests_party 
FOREIGN KEY (party_id) 
REFERENCES public.invite_parties(id) 
ON DELETE SET NULL;