import { supabase } from '../db/supabase';

// SECURITY: Audit log for critical security events
// Events are logged to the audit_logs table in Supabase (fire-and-forget, never blocks main flow)

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_change'
  | 'password_reset'
  | 'account_locked'
  | 'role_change'
  | 'user_invited'
  | 'user_registered'
  | 'token_refresh';

interface AuditLogEntry {
  action: AuditAction;
  user_id?: number;
  target_user_id?: number;
  ip_address?: string;
  details?: Record<string, unknown>;
}

export function logAuditEvent(entry: AuditLogEntry): void {
  // Fire-and-forget: never await, never block the request
  try {
    supabase
      .from('audit_logs')
      .insert({
        action: entry.action,
        user_id: entry.user_id || null,
        target_user_id: entry.target_user_id || null,
        ip_address: entry.ip_address || null,
        details: entry.details || null,
        created_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[Audit] Failed to write audit log:', error.message);
        }
      });
  } catch (err) {
    console.warn('[Audit] Audit log error:', err);
  }
}
