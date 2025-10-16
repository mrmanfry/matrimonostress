-- Abilita estensioni necessarie per cron job
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Crea cron job per notifiche pagamenti (esecuzione giornaliera alle 9:00 AM)
SELECT cron.schedule(
  'check-payment-reminders-daily',
  '0 9 * * *', -- Ogni giorno alle 9:00 AM
  $$
  SELECT
    net.http_post(
      url := 'https://evaivaudtestjzckutsd.supabase.co/functions/v1/check-payment-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('time', now())
    ) as request_id;
  $$
);

-- Commento per documentazione
COMMENT ON EXTENSION pg_cron IS 'Scheduler per eseguire job periodici nel database';
COMMENT ON EXTENSION pg_net IS 'Client HTTP asincrono per chiamate API esterne';