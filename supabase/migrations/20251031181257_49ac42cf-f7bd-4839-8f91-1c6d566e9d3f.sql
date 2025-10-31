-- Rimuovi il vecchio constraint sullo status dei fornitori
ALTER TABLE public.vendors 
DROP CONSTRAINT IF EXISTS vendors_status_check;

-- Aggiungi il nuovo constraint con i 4 stati: evaluating, booked, confirmed, rejected
ALTER TABLE public.vendors 
ADD CONSTRAINT vendors_status_check 
CHECK (status IN ('evaluating', 'booked', 'confirmed', 'rejected'));

-- Commento: Aggiunto lo stato "booked" (Opzionato) per riflettere il workflow reale di prenotazione fornitori