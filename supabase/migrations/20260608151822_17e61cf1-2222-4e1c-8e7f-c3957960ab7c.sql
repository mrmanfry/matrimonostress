
CREATE TABLE public.security_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  resource TEXT NOT NULL,
  reason TEXT NOT NULL,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  wedding_id UUID NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  ip TEXT NULL,
  user_agent TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_security_audit_log_wedding_created
  ON public.security_audit_log (wedding_id, created_at DESC);
CREATE INDEX idx_security_audit_log_user_created
  ON public.security_audit_log (user_id, created_at DESC);
CREATE INDEX idx_security_audit_log_event_created
  ON public.security_audit_log (event_type, created_at DESC);

GRANT SELECT ON public.security_audit_log TO authenticated;
GRANT ALL ON public.security_audit_log TO service_role;

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Co-planners and planners can view audit log for their weddings"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (
  wedding_id IS NOT NULL AND (
    public.has_wedding_role(auth.uid(), wedding_id, 'co_planner'::app_role)
    OR public.has_wedding_role(auth.uid(), wedding_id, 'planner'::app_role)
  )
);
