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

    if (resend) {
      try {
        await resend.emails.send({
          from: fromEmail,
          to: adminEmail,
          subject: `[AI CoachCall] New Demo Request — ${company}`,
          html: htmlContent,
          replyTo: email,
        });
        console.log(`[Contact] Demo request email sent for: ${email} (${company})`);
      } catch (emailError) {
        console.error('[Contact] Failed to send email:', emailError);
        return res.status(500).json({ error: 'Failed to send request. Please try again.' });
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
