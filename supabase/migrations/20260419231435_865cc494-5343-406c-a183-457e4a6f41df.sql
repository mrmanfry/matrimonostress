-- 1. Tabella cache AI affinities
CREATE TABLE IF NOT EXISTS public.ai_affinities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  guest_id_1 UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  guest_id_2 UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score BETWEEN 50 AND 400),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wedding_id, guest_id_1, guest_id_2)
);

ALTER TABLE public.ai_affinities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planners can manage affinities"
  ON public.ai_affinities FOR ALL
  USING (
    has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
    OR has_wedding_role(auth.uid(), wedding_id, 'manager'::app_role)
    OR has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role)
  );

CREATE POLICY "Users can view affinities for accessible weddings"
  ON public.ai_affinities FOR SELECT
  USING (has_wedding_access(auth.uid(), wedding_id));

CREATE INDEX IF NOT EXISTS idx_ai_affinities_wedding 
  ON public.ai_affinities(wedding_id);

-- 2. is_locked già presente su tables, aggiungo solo l'indice
CREATE INDEX IF NOT EXISTS idx_tables_wedding_locked 
  ON public.tables(wedding_id, is_locked);

-- 3. Flag is_vip su guests
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;