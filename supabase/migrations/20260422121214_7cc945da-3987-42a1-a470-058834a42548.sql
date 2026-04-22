-- Partner unlock columns on weddings (for couple subscription model)
ALTER TABLE public.weddings
  ADD COLUMN IF NOT EXISTS partner_unlocked_email TEXT,
  ADD COLUMN IF NOT EXISTS partner_unlocked_at TIMESTAMPTZ;

-- Planner subscriptions table
CREATE TABLE IF NOT EXISTS public.planner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'solo',
  slot_limit INTEGER NOT NULL DEFAULT 1,
  subscription_status TEXT NOT NULL DEFAULT 'trialing',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planner_subscriptions ENABLE ROW LEVEL SECURITY;

-- Planner can view/update their own subscription row
CREATE POLICY "Planner can view own subscription"
  ON public.planner_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Planner can insert own subscription"
  ON public.planner_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_planner_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planner_subscriptions_updated_at ON public.planner_subscriptions;
CREATE TRIGGER planner_subscriptions_updated_at
  BEFORE UPDATE ON public.planner_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_planner_subscriptions_updated_at();

-- RPC: count of "active" weddings managed by a planner
-- Active = wedding_date >= now() - 30 days (future or recent)
CREATE OR REPLACE FUNCTION public.count_active_planner_weddings(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INT
  FROM public.user_roles ur
  JOIN public.weddings w ON w.id = ur.wedding_id
  WHERE ur.user_id = p_user_id
    AND ur.role IN ('planner', 'co_planner')
    AND (w.wedding_date IS NULL OR w.wedding_date >= (CURRENT_DATE - INTERVAL '30 days'))
$$;

-- RPC: check if couple user already owns a wedding (for "1 wedding per couple" rule)
CREATE OR REPLACE FUNCTION public.user_owns_couple_wedding(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = 'co_planner'
  )
$$;