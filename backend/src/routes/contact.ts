import { Router } from 'express';
import { Resend } from 'resend';

const router = Router();

// Initialize Resend
const resendApiKey = process.env.RESEND_API_KEY?.trim().replace(/^=/, '') || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'AI CoachCall <noreply@aicoachcall.com>';
const adminEmail = process.env.CONTACT_ADMIN_EMAIL || 'support@aicoachcall.com';

// POST /api/contact — public contact form submission
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, company, numUsers, carrier, usesCrm, whichCrm } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !company || !numUsers || !carrier) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Build email HTML
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">New Demo Request — AI CoachCall</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Name</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${firstName} ${lastName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${email}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${phone}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Company</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${company}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Users to integrate</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${numUsers}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Current carrier</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${carrier}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Uses CRM</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${usesCrm ? 'Yes' : 'No'}${usesCrm && whichCrm ? ` — ${whichCrm}` : ''}</td></tr>
        </table>
        <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">This request was submitted via the AI CoachCall website contact form.</p>
      </div>
    `;

    // Confirmation email HTML for the user
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="text-align: center; padding: 32px 0 16px;">
          <h1 style="color: #16a34a; font-size: 24px; margin: 0;">AI CoachCall</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 0 16px;">
          <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Pedido de Demonstração Confirmado</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            Olá <strong>${firstName}</strong>,
          </p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            O seu pedido de demonstração foi recebido com sucesso. A nossa equipa irá analisar o seu pedido e entraremos em contacto consigo em breve.
          </p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #166534; font-size: 14px; margin: 0 0 8px;"><strong>Resumo do pedido:</strong></p>
            <p style="color: #166534; font-size: 14px; margin: 4px 0;">Nome: ${firstName} ${lastName}</p>
            <p style="color: #166534; font-size: 14px; margin: 4px 0;">Empresa: ${company}</p>
            <p style="color: #166534; font-size: 14px; margin: 4px 0;">Email: ${email}</p>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
            Se tiver alguma questão, não hesite em responder a este email.
          </p>
        </div>
        <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
          © ${new Date().getFullYear()} AI CoachCall. Todos os direitos reservados.
        </div>
      </div>
    `;

    if (resend) {
      // Send notification email to admin
      try {
        await resend.emails.send({
          from: fromEmail,
          to: adminEmail,
          subject: `[AI CoachCall] New Demo Request — ${company}`,
          html: htmlContent,
          replyTo: email,
        });
        console.log(`[Contact] Admin notification sent for: ${email} (${company})`);
      } catch (emailError) {
        console.error('[Contact] Failed to send admin email:', emailError);
        return res.status(500).json({ error: 'Failed to send request. Please try again.' });
      }

      // Send confirmation email to user (non-blocking — don't fail the request)
      try {
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: 'Pedido de Demonstração Confirmado — AI CoachCall',
          html: confirmationHtml,
        });
        console.log(`[Contact] Confirmation email sent to: ${email}`);
      } catch (confirmError) {
        console.error('[Contact] Failed to send confirmation email (non-critical):', confirmError);
      }
    } else {
      console.log(`[Contact] Demo request received (no Resend configured):`, { firstName, lastName, email, phone, company, numUsers, carrier, usesCrm, whichCrm });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Contact] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
