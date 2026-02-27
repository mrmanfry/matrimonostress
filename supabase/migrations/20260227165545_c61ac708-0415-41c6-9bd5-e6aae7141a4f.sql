
-- Add subscription/trial fields to weddings
ALTER TABLE public.weddings
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS is_date_tentative boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_role_type text,
  ADD COLUMN IF NOT EXISTS welcome_email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_reminder_5d_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_reminder_2d_sent boolean NOT NULL DEFAULT false;
