import { Response, NextFunction } from 'express';
import { Resend } from 'resend';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest } from './auth';

// Plan minute limits per user per month (in minutes)
export const PLAN_MINUTES_PER_USER: Record<string, number> = {
  starter: 1200,   // 20 hours
  medium: 2400,    // 40 hours
  pro: 3600,       // 60 hours
  master: Infinity, // unlimited
};

// Initialize Resend for usage alert emails
const resendApiKey = process.env.RESEND_API_KEY?.trim().replace(/^=/, '') || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'AI CoachCall <noreply@aicoachcall.com>';

// In-memory cache to prevent duplicate notifications (resets on server restart)
const notificationsSent = new Set<string>();

function getNotificationKey(userId: number, type: string): string {
  const month = new Date().toISOString().slice(0, 7); // "2026-02"
  return `${userId}-${month}-${type}`;
}

// Clean old month entries periodically
setInterval(() => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  for (const key of notificationsSent) {
    if (!key.includes(currentMonth)) {
      notificationsSent.delete(key);
    }
  }
}, 60 * 60 * 1000); // Every hour

// Helper: get the start of the current calendar month (UTC)
function getMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

// Helper: get usage in minutes for a user this month
export async function getUserMonthlyUsage(userId: number, companyId: number): Promise<number> {
  const monthStart = getMonthStart();

  const { data } = await supabase
    .from('calls')
    .select('duration_seconds')
    .eq('agent_id', userId)
    .eq('company_id', companyId)
    .gte('call_date', monthStart);

  if (!data || data.length === 0) return 0;

  const totalSeconds = data.reduce((sum: number, call: any) => sum + (call.duration_seconds || 0), 0);
  return Math.ceil(totalSeconds / 60); // Convert to minutes, rounded up
}

// Bilingual usage alert email builder
type AlertLang = 'pt' | 'en';

function buildUsageAlertEmail(
  lang: AlertLang,
  agentName: string,
  usedMinutes: number,
  limitMinutes: number,
  plan: string,
  companyName: string,
  type: 'warning' | 'exceeded'
) {
  const percentage = Math.round((usedMinutes / limitMinutes) * 100);
  const limitHours = Math.floor(limitMinutes / 60);
  const usedHours = Math.floor(usedMinutes / 60);
  const usedMins = usedMinutes % 60;
  const isWarning = type === 'warning';
  const statusColor = isWarning ? '#f59e0b' : '#ef4444';
  const statusIcon = isWarning ? '⚠️' : '🚫';
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  const t = lang === 'en' ? {
    subject: isWarning
      ? `AI CoachCall - ${agentName} is approaching the minutes limit`
      : `AI CoachCall - ${agentName} has exceeded monthly minutes`,
    heading: 'Usage Alert',
    statusText: isWarning
      ? `is at ${percentage}% of the monthly limit`
      : 'has exceeded the monthly minutes limit',
    currentUsage: 'Current usage',
    usageLabel: `${percentage}% used — Plan ${planLabel}`,
    bodyWarning: 'When minutes run out, this user will lose access to the platform until next month. Consider upgrading the plan to avoid interruptions.',
    bodyExceeded: 'This user has lost access to the platform. Minutes will reset at the beginning of next month. To restore access immediately, upgrade the plan.',
    button: 'Manage Plan',
    companyLabel: `Company: ${companyName}`,
    footer: `© ${new Date().getFullYear()} AI CoachCall — Automated email, do not reply.`,
    userLabel: 'User',
  } : {
    subject: isWarning
      ? `AI CoachCall - ${agentName} está a atingir o limite de minutos`
      : `AI CoachCall - ${agentName} esgotou os minutos do mês`,
    heading: 'Alerta de Consumo',
    statusText: isWarning
      ? `está a ${percentage}% do limite mensal`
      : 'esgotou o limite mensal de minutos',
    currentUsage: 'Consumo atual',
    usageLabel: `${percentage}% utilizado — Plano ${planLabel}`,
    bodyWarning: 'Quando os minutos se esgotarem, este utilizador ficará sem acesso à plataforma até ao próximo mês. Considere fazer upgrade do plano para evitar interrupções.',
    bodyExceeded: 'Este utilizador ficou sem acesso à plataforma. Os minutos serão repostos no início do próximo mês. Para restaurar o acesso imediatamente, faça upgrade do plano.',
    button: 'Gerir Plano',
    companyLabel: `Empresa: ${companyName}`,
    footer: `© ${new Date().getFullYear()} AI CoachCall — Email automático, não responda.`,
    userLabel: 'O utilizador',
  };

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, ${statusColor}, ${isWarning ? '#d97706' : '#dc2626'}); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${statusIcon} ${t.heading}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">AI CoachCall</p>
      </div>
      <div style="padding: 32px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          ${t.userLabel} <strong>${agentName}</strong> ${t.statusText}.
        </p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">${t.currentUsage}</p>
          <p style="color: ${statusColor}; font-size: 32px; font-weight: 700; margin: 0;">
            ${usedHours}h${String(usedMins).padStart(2, '0')} / ${limitHours}h
          </p>
          <p style="color: #6b7280; font-size: 13px; margin: 8px 0 0;">${t.usageLabel}</p>
        </div>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
          ${isWarning ? t.bodyWarning : t.bodyExceeded}
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?tab=payment"
             style="display: inline-block; background: #16a34a; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            ${t.button}
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px; text-align: center;">
          ${t.companyLabel}
        </p>
      </div>
      <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">${t.footer}</p>
      </div>
    </div>
  `;

  return { subject: t.subject, html };
}

// Send usage alert email to company admin(s) — bilingual per admin preference
async function sendUsageAlertEmail(
  companyId: number,
  agentName: string,
  usedMinutes: number,
  limitMinutes: number,
  plan: string,
  type: 'warning' | 'exceeded'
): Promise<void> {
  // Find admin_manager(s) for this company (include language preference)
  const { data: admins } = await supabase
    .from('users')
    .select('email, display_name, language_preference')
    .eq('company_id', companyId)
    .eq('role', 'admin_manager');

  if (!admins || admins.length === 0) return;

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single();

  const companyName = company?.name || 'N/A';

  for (const admin of admins) {
    if (!admin.email) continue;
    const lang: AlertLang = admin.language_preference === 'en' ? 'en' : 'pt';
    const { subject, html } = buildUsageAlertEmail(lang, agentName, usedMinutes, limitMinutes, plan, companyName, type);

    try {
      if (resend) {
        await resend.emails.send({
          from: fromEmail,
          to: admin.email,
          subject,
          html,
        });
        console.log(`[Usage] Alert email sent to ${admin.email} (${type}, ${lang}) for agent ${agentName}`);
      } else {
        console.log(`[Usage] Resend not configured. Would send ${type} alert to ${admin.email} for agent ${agentName}`);
      }
    } catch (err) {
      console.error(`[Usage] Failed to send alert email to ${admin.email}:`, err);
    }
  }
}

export async function requireActiveSubscription(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Developer role bypasses subscription check (no company)
  if (req.user?.role === 'developer') {
    return next();
  }

  const companyId = req.user?.companyId;
  if (!companyId) {
    res.status(402).json({
      error: 'subscription_required',
      message: 'Active subscription required',
    });
    return;
  }

  const { data: company } = await supabase
    .from('companies')
    .select('subscription_status, subscription_plan')
    .eq('id', companyId)
    .single();

  if (!company || company.subscription_status !== 'active') {
    res.status(402).json({
      error: 'subscription_required',
      message: 'Active subscription required',
      subscription_status: company?.subscription_status || 'none',
    });
    return;
  }

  // Per-user minute check (only for agents — admins need access to manage team)
  if (req.user?.role === 'agent' && company.subscription_plan) {
    const limit = PLAN_MINUTES_PER_USER[company.subscription_plan];
    if (limit !== undefined && limit !== Infinity) {
      const usedMinutes = await getUserMonthlyUsage(req.user.userId, companyId);
      const percentage = (usedMinutes / limit) * 100;

      // Get agent name for email (lazy, only when needed)
      const getAgentName = async (): Promise<string> => {
        const { data: user } = await supabase
          .from('users')
          .select('display_name, email')
          .eq('id', req.user!.userId)
          .single();
        return user?.display_name || user?.email || `User #${req.user!.userId}`;
      };

      // Send warning email at 95%
      if (percentage >= 95 && percentage < 100) {
        const warningKey = getNotificationKey(req.user.userId, 'warning');
        if (!notificationsSent.has(warningKey)) {
          notificationsSent.add(warningKey);
          const agentName = await getAgentName();
          // Fire and forget — don't block the request
          sendUsageAlertEmail(companyId, agentName, usedMinutes, limit, company.subscription_plan, 'warning')
            .catch(err => console.error('[Usage] Warning email error:', err));
        }
      }

      // Block and send exceeded email at 100%
      if (usedMinutes >= limit) {
        const exceededKey = getNotificationKey(req.user.userId, 'exceeded');
        if (!notificationsSent.has(exceededKey)) {
          notificationsSent.add(exceededKey);
          const agentName = await getAgentName();
          sendUsageAlertEmail(companyId, agentName, usedMinutes, limit, company.subscription_plan, 'exceeded')
            .catch(err => console.error('[Usage] Exceeded email error:', err));
        }

        res.status(402).json({
          error: 'minutes_exceeded',
          message: 'Monthly minutes limit exceeded',
          used_minutes: usedMinutes,
          limit_minutes: limit,
          plan: company.subscription_plan,
        });
        return;
      }
    }
  }

  next();
}
