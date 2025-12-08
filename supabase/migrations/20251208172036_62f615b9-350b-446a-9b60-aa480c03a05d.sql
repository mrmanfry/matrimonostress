-- Add category column to checklist_tasks
ALTER TABLE public.checklist_tasks 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for faster filtering by category
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_category ON public.checklist_tasks(category);

-- Backfill existing tasks based on title keywords
UPDATE public.checklist_tasks SET category = 
  CASE
    -- Cerimonia
    WHEN LOWER(title) LIKE '%cerimonia%' OR LOWER(title) LIKE '%testimon%' OR LOWER(title) LIKE '%chiesa%' 
         OR LOWER(title) LIKE '%altare%' OR LOWER(title) LIKE '%prova generale%' OR LOWER(title) LIKE '%voti%'
         OR LOWER(title) LIKE '%lettur%' OR LOWER(title) LIKE '%musica cerimonia%' THEN 'cerimonia'
    -- Look
    WHEN LOWER(title) LIKE '%abito%' OR LOWER(title) LIKE '%trucco%' OR LOWER(title) LIKE '%parrucch%' 
         OR LOWER(title) LIKE '%scarpe%' OR LOWER(title) LIKE '%accessori%' OR LOWER(title) LIKE '%fedi%'
         OR LOWER(title) LIKE '%vestito%' OR LOWER(title) LIKE '%gioiell%' THEN 'look'
    -- Ricevimento
    WHEN LOWER(title) LIKE '%ricevimento%' OR LOWER(title) LIKE '%location%' OR LOWER(title) LIKE '%menu%'
         OR LOWER(title) LIKE '%menù%' OR LOWER(title) LIKE '%catering%' OR LOWER(title) LIKE '%torta%'
         OR LOWER(title) LIKE '%musica%' OR LOWER(title) LIKE '%dj%' OR LOWER(title) LIKE '%band%'
         OR LOWER(title) LIKE '%fiori%' OR LOWER(title) LIKE '%allestiment%' OR LOWER(title) LIKE '%decoraz%'
         OR LOWER(title) LIKE '%tableau%' THEN 'ricevimento'
    -- Fornitori
    WHEN LOWER(title) LIKE '%fotograf%' OR LOWER(title) LIKE '%video%' OR LOWER(title) LIKE '%fiorai%'
         OR LOWER(title) LIKE '%fiorista%' OR LOWER(title) LIKE '%preventiv%' OR LOWER(title) LIKE '%contratt%'
         OR LOWER(title) LIKE '%fornitore%' OR LOWER(title) LIKE '%prenota%' THEN 'fornitori'
    -- Logistica
    WHEN LOWER(title) LIKE '%invitat%' OR LOWER(title) LIKE '%rsvp%' OR LOWER(title) LIKE '%partecipaz%'
         OR LOWER(title) LIKE '%tavol%' OR LOWER(title) LIKE '%posti%' OR LOWER(title) LIKE '%trasport%'
         OR LOWER(title) LIKE '%alloggi%' OR LOWER(title) LIKE '%hotel%' OR LOWER(title) LIKE '%viaggio%'
         OR LOWER(title) LIKE '%luna di miele%' OR LOWER(title) LIKE '%timeline%' THEN 'logistica'
    -- Amministrativo
    WHEN LOWER(title) LIKE '%document%' OR LOWER(title) LIKE '%certificat%' OR LOWER(title) LIKE '%comune%'
         OR LOWER(title) LIKE '%anagrafe%' OR LOWER(title) LIKE '%pagament%' OR LOWER(title) LIKE '%acconto%'
         OR LOWER(title) LIKE '%saldo%' OR LOWER(title) LIKE '%budget%' OR LOWER(title) LIKE '%assicuraz%'
         OR LOWER(title) LIKE '%corso%' THEN 'amministrativo'
    ELSE 'altro'
  END
WHERE category IS NULL;