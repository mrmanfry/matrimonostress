-- Sprint 1: Schema per RSVP Campaign & Landing Page

-- Configurazione landing page RSVP sul matrimonio
ALTER TABLE public.weddings 
ADD COLUMN IF NOT EXISTS rsvp_config JSONB DEFAULT '{
  "hero_image_url": null,
  "welcome_title": "Benvenuti al nostro Matrimonio",
  "welcome_text": "Non vediamo l''ora di festeggiare con voi!",
  "deadline_date": null
}'::jsonb;

-- Gestione +1 (accompagnatore) sugli invitati
ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS allow_plus_one BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS plus_one_name TEXT,
ADD COLUMN IF NOT EXISTS plus_one_menu TEXT;

-- Tracking ultima modifica del nucleo per conflict detection
ALTER TABLE public.invite_parties
ADD COLUMN IF NOT EXISTS last_updated_by_guest_id UUID REFERENCES public.guests(id),
ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMP WITH TIME ZONE;