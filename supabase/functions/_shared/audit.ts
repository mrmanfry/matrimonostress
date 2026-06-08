// Shared helper to write security audit log entries from edge functions.
// Records rejected/blocked access attempts to public.security_audit_log.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export interface AuditEvent {
  event_type: string; // e.g. "auth_missing", "forbidden", "cron_unauthorized", "spoofed_sender"
  resource: string; // e.g. "edge:check-subscription", "vendor:iban", "storage:camera-photos"
  reason: string; // short human-readable explanation
  user_id?: string | null;
  wedding_id?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort insert into security_audit_log. Never throws — failures are logged
 * to console only so audit failures cannot break the calling function's response.
 */
export async function logSecurityEvent(req: Request, evt: AuditEvent): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      null;
    const ua = req.headers.get("user-agent") || null;

    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await admin.from("security_audit_log").insert({
      event_type: evt.event_type,
      resource: evt.resource,
      reason: evt.reason,
      user_id: evt.user_id ?? null,
      wedding_id: evt.wedding_id ?? null,
      ip,
      user_agent: ua,
      metadata: evt.metadata ?? {},
    });
    if (error) console.error("[audit] insert failed:", error.message);
  } catch (err) {
    console.error("[audit] unexpected error:", err);
  }
}
