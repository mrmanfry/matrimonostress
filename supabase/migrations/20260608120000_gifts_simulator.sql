-- =============================================
-- GIFTS SIMULATOR / NET BUDGET MODULE
-- =============================================

-- 1. Enum per categoria regalo
CREATE TYPE gift_category_enum AS ENUM ('cash', 'physical_registry', 'other');

-- 2. Enum per stato ringraziamento
CREATE TYPE thank_you_status_enum AS ENUM ('pending', 'sent');

-- 3. Tabella principale: gifts
CREATE TABLE public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.invite_parties(id) ON DELETE CASCADE,
  gift_category gift_category_enum NOT NULL DEFAULT 'cash',
  amount NUMERIC(12, 2),
  notes TEXT,
  thank_you_status thank_you_status_enum NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Constraint: amount obbligatorio se cash
ALTER TABLE public.gifts
  ADD CONSTRAINT gifts_cash_requires_amount
  CHECK (gift_category != 'cash' OR amount IS NOT NULL);

-- 5. Indici
CREATE INDEX idx_gifts_wedding_id ON public.gifts(wedding_id);
CREATE INDEX idx_gifts_party_id ON public.gifts(party_id);

-- 6. Trigger updated_at
CREATE TRIGGER update_gifts_updated_at
BEFORE UPDATE ON public.gifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. RLS
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- Solo co_planner può leggere e scrivere i dati dei regali (dati sensibili)
CREATE POLICY "Co-planners can manage gifts"
ON public.gifts
FOR ALL
TO authenticated
USING (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
)
WITH CHECK (
  has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
);

-- 8. RPC: calcolo forecast regali
-- Restituisce le metriche aggregate per il simulatore.
-- avg_estimate: quota media stimata per nucleo (fornita dal frontend)
CREATE OR REPLACE FUNCTION public.get_gift_forecast(
  p_wedding_id UUID,
  p_avg_estimate NUMERIC DEFAULT 0
)
RETURNS TABLE (
  total_cash_received NUMERIC,
  total_expenses NUMERIC,
  eligible_parties_count BIGINT,
  total_forecast NUMERIC,
  projected_liquidity NUMERIC,
  net_budget_coverage NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  -- Somma regali cash già registrati
  cash_received AS (
    SELECT COALESCE(SUM(g.amount), 0) AS total
    FROM public.gifts g
    WHERE g.wedding_id = p_wedding_id
      AND g.gift_category = 'cash'
      AND g.amount IS NOT NULL
  ),
  -- Totale spese preventivate (planned / expected)
  expenses_total AS (
    SELECT COALESCE(SUM(
      CASE
        WHEN ei.calculation_mode = 'fixed' THEN COALESCE(ei.fixed_amount, 0)
        ELSE COALESCE(ei.estimated_amount, ei.fixed_amount, 0)
      END
    ), 0) AS total
    FROM public.expense_items ei
    WHERE ei.wedding_id = p_wedding_id
  ),
  -- Nuclei familiari eleggibili per la stima:
  -- RSVP = Confermato o In attesa, e nessun regalo già registrato
  parties_with_gifts AS (
    SELECT DISTINCT g.party_id
    FROM public.gifts g
    WHERE g.wedding_id = p_wedding_id
  ),
  eligible AS (
    SELECT COUNT(*) AS cnt
    FROM public.invite_parties ip
    WHERE ip.wedding_id = p_wedding_id
      AND ip.rsvp_status IN ('Confermato', 'In attesa')
      AND ip.id NOT IN (SELECT party_id FROM parties_with_gifts)
  )
  SELECT
    cr.total                                                   AS total_cash_received,
    et.total                                                   AS total_expenses,
    el.cnt                                                     AS eligible_parties_count,
    el.cnt * p_avg_estimate                                    AS total_forecast,
    cr.total + (el.cnt * p_avg_estimate)                      AS projected_liquidity,
    CASE WHEN et.total > 0
      THEN ROUND(((cr.total + (el.cnt * p_avg_estimate)) / et.total) * 100, 1)
      ELSE 0
    END                                                        AS net_budget_coverage
  FROM cash_received cr, expenses_total et, eligible el;
$$;
