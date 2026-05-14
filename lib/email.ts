import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "Alto <hello@altobroker.us>";

export function isEmailConfigured() {
  return Boolean(apiKey);
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY missing" };
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
    });
    if (error) return { ok: false, error: error.message ?? String(error) };
    return { ok: true, id: data?.id ?? "" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "send failed",
    };
  }
}

// ─── Welcome email template ─────────────────────────────────────────

export function waitlistWelcomeHtml(): string {
  return `
  <!doctype html>
  <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#050507; color:#fff; padding:32px 24px; max-width:560px; margin:0 auto;">
      <div style="text-align:center; margin-bottom:32px;">
        <svg width="48" height="48" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;">
          <defs>
            <linearGradient id="ew" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#38bdf8"/>
              <stop offset="1" stop-color="#0369a1"/>
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="14" fill="url(#ew)"/>
          <g fill="none" stroke="#ffffff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 48 L32 16 L48 48"/>
            <path d="M23 38 L41 38" stroke-width="4" opacity="0.55"/>
          </g>
        </svg>
      </div>
      <h1 style="font-size:28px; font-weight:600; margin:0 0 16px; letter-spacing:-0.02em;">You're on the Alto waitlist.</h1>
      <p style="font-size:16px; line-height:1.6; color:rgba(255,255,255,0.7); margin:0 0 16px;">
        Thanks for joining. Alto is the AI that replaces brokers across insurance,
        mortgage, and real estate — one conversation, every provider, no commissions.
      </p>
      <p style="font-size:16px; line-height:1.6; color:rgba(255,255,255,0.7); margin:0 0 24px;">
        We're launching in June 2026. The moment we go live, you'll get an email
        with your invite link.
      </p>
      <p style="font-size:14px; line-height:1.6; color:rgba(255,255,255,0.5); margin:0 0 16px;">
        Hit reply if you want to share what you're hoping Alto solves — every reply
        I read shapes the product.
      </p>
      <p style="font-size:14px; line-height:1.6; color:rgba(255,255,255,0.5); margin:32px 0 0;">
        — Alto<br/>
        <a href="https://altobroker.us" style="color:#38bdf8; text-decoration:none;">altobroker.us</a>
      </p>
    </body>
  </html>`;
}
