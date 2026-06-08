DROP FUNCTION IF EXISTS public.get_gift_forecast(uuid, numeric);

CREATE OR REPLACE FUNCTION public.get_gift_forecast(p_wedding_id uuid, p_avg_estimate numeric DEFAULT 0)
 RETURNS TABLE(total_cash_received numeric, total_expenses numeric, eligible_parties_count bigint, eligible_persons_count bigint, total_forecast numeric, projected_liquidity numeric, net_budget_coverage numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_wedding_access(auth.uid(), p_wedding_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH
  cash_received AS (
    SELECT COALESCE(SUM(g.amount), 0) AS total
    FROM public.gifts g
    WHERE g.wedding_id = p_wedding_id
      AND g.gift_category = 'cash'
      AND g.amount IS NOT NULL
  ),
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
  parties_with_gifts AS (
    SELECT DISTINCT g.party_id
    FROM public.gifts g
    WHERE g.wedding_id = p_wedding_id
  ),
  eligible_parties AS (
    SELECT ip.id
    FROM public.invite_parties ip
    WHERE ip.wedding_id = p_wedding_id
      AND ip.rsvp_status IN ('Confermato', 'In attesa')
      AND ip.id NOT IN (SELECT party_id FROM parties_with_gifts)
  ),
  eligible AS (
    SELECT COUNT(*) AS cnt FROM eligible_parties
  ),
  eligible_persons AS (
    SELECT COUNT(*) AS cnt
    FROM public.guests gu
    WHERE gu.wedding_id = p_wedding_id
      AND gu.party_id IN (SELECT id FROM eligible_parties)
      AND COALESCE(gu.is_couple_member, false) = false
      AND COALESCE(gu.is_staff, false) = false
  )
  SELECT
    cr.total                                    AS total_cash_received,
    et.total                                    AS total_expenses,
    el.cnt                                      AS eligible_parties_count,
    ep.cnt                                      AS eligible_persons_count,
    ep.cnt * p_avg_estimate                     AS total_forecast,
    cr.total + (ep.cnt * p_avg_estimate)        AS projected_liquidity,
    CASE WHEN et.total > 0
      THEN ROUND(((cr.total + (ep.cnt * p_avg_estimate)) / et.total) * 100, 1)
      ELSE 0
    END                                         AS net_budget_coverage
  FROM cash_received cr, expenses_total et, eligible el, eligible_persons ep;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_gift_forecast(uuid, numeric) TO authenticated;