import nodemailer from 'nodemailer';
import config from '../config';

// If SMTP isn't configured (e.g. local dev without a mail provider), transporter stays null
// and sendMail becomes a safe no-op - this must never crash the request that triggered it.
const transporter =
  config.mail.host && config.mail.user
    ? nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.port === 465,
        auth: { user: config.mail.user, pass: config.mail.pass },
      })
    : null;

const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
  if (!transporter) {
    console.log(`[mailer] SMTP not configured — skipped email to ${to}: "${subject}"`);
    return;
  }
  try {
    await transporter.sendMail({ from: config.mail.from, to, subject, html });
  } catch (err) {
    // Notifications are best-effort: a failed email must never fail the underlying
    // business operation (e.g. a shipment status update) that triggered it.
    console.error('[mailer] Failed to send email:', err);
  }
};

export default sendMail;
