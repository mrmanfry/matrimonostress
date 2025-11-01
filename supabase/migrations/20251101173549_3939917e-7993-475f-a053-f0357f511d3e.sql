-- =============================================
-- CAPITOLO A: FONDAZIONE SISTEMA RSVP
-- Creazione struttura "Nuclei di Invito"
-- =============================================

-- 1. Enum per lo stato RSVP (a livello di nucleo)
CREATE TYPE rsvp_status_enum AS ENUM ('In attesa', 'Confermato', 'Rifiutato');

-- 2. Enum per lo stato di invio WhatsApp
CREATE TYPE send_status_enum AS ENUM ('Non Inviato', 'Inviato', 'Fallito');

-- 3. Tabella principale: InviteParties (Il "Nucleo di Invito")
CREATE TABLE public.invite_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  party_name TEXT NOT NULL,
  rsvp_status rsvp_status_enum NOT NULL DEFAULT 'In attesa',
  confirmed_by_guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  last_rsvp_log_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabella Audit Trail: RSVP_Log
CREATE TABLE public.rsvp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.invite_parties(id) ON DELETE CASCADE,
  guest_id_actor UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Aggiungere foreign key circolare (dopo creazione rsvp_log)
ALTER TABLE public.invite_parties 
ADD CONSTRAINT fk_last_rsvp_log 
FOREIGN KEY (last_rsvp_log_id) 
REFERENCES public.rsvp_log(id) 
ON DELETE SET NULL;

-- 6. Modifiche alla tabella Guests
ALTER TABLE public.guests
ADD COLUMN party_id UUID REFERENCES public.invite_parties(id) ON DELETE SET NULL,
ADD COLUMN is_child BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN unique_rsvp_token TEXT UNIQUE,
ADD COLUMN rsvp_send_status send_status_enum NOT NULL DEFAULT 'Non Inviato';

-- 7. Creare indice per il token RSVP (per lookup veloce)
CREATE INDEX idx_guests_rsvp_token ON public.guests(unique_rsvp_token);

-- 8. Creare indice per party_id
CREATE INDEX idx_guests_party_id ON public.guests(party_id);

-- 9. Trigger per aggiornare updated_at su invite_parties
CREATE TRIGGER update_invite_parties_updated_at
BEFORE UPDATE ON public.invite_parties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Funzione per generare token RSVP univoco
CREATE OR REPLACE FUNCTION public.generate_rsvp_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unique_rsvp_token IS NULL AND NEW.phone IS NOT NULL THEN
    -- Genera un token univoco basato su UUID
    NEW.unique_rsvp_token := LOWER(REPLACE(gen_random_uuid()::TEXT, '-', ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. Trigger per generare token automaticamente
CREATE TRIGGER generate_guest_rsvp_token
BEFORE INSERT OR UPDATE OF phone ON public.guests
FOR EACH ROW
EXECUTE FUNCTION public.generate_rsvp_token();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- 12. Enable RLS su nuove tabelle
ALTER TABLE public.invite_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_log ENABLE ROW LEVEL SECURITY;

-- 13. Policies per invite_parties
CREATE POLICY "Users can view parties for accessible weddings"
ON public.invite_parties
FOR SELECT
USING (has_wedding_access(auth.uid(), wedding_id));

CREATE POLICY "Co-planners and managers can manage parties"
ON public.invite_parties
FOR ALL
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
  has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
);

-- 14. Policies per rsvp_log
CREATE POLICY "Users can view logs for accessible parties"
ON public.rsvp_log
FOR SELECT
USING (
  party_id IN (
    SELECT id FROM public.invite_parties 
    WHERE has_wedding_access(auth.uid(), wedding_id)
  )
);

CREATE POLICY "Co-planners and managers can manage logs"
ON public.rsvp_log
FOR ALL
USING (
  party_id IN (
    SELECT id FROM public.invite_parties 
    WHERE has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role) OR 
           has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
  )
);

-- 15. Policy PUBBLICA per form RSVP (accesso via token)
CREATE POLICY "Anyone can view guest by valid token"
ON public.guests
FOR SELECT
USING (unique_rsvp_token IS NOT NULL);

CREATE POLICY "Anyone can update RSVP via valid token"
ON public.invite_parties
FOR UPDATE
USING (true)
WITH CHECK (true);