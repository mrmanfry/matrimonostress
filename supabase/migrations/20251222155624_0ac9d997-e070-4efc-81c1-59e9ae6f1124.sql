-- 1. TRACKING CAMPAGNE - Colonne per tracciare QUANDO è stato inviato ogni tipo di messaggio
ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS save_the_date_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS formal_invite_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. RISPOSTE "SAVE THE DATE" (Soft RSVP) - Separato dallo status ufficiale
ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS std_response TEXT CHECK (std_response IN ('likely_yes', 'likely_no', 'unsure')),
ADD COLUMN IF NOT EXISTS std_responded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. MIGRAZIONE DATI ESISTENTI (Backfill) - Mappiamo invii passati come inviti formali
UPDATE public.guests 
SET formal_invite_sent_at = rsvp_invitation_sent 
WHERE rsvp_invitation_sent IS NOT NULL AND formal_invite_sent_at IS NULL;