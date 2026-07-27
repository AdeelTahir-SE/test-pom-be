import { Resend } from "resend";
import { env } from "@/lib/env";

// Welcome email for newly-created accounts, carrying the one-time credential
// (worker login code or manager temporary password) generated at creation.
// NEVER throws: account creation must succeed even if email delivery fails or
// no API key is configured yet — the credential is also returned in the API
// response and shown once in the UI as a fallback (same Failure Rule pattern
// used for OCR/transcription elsewhere in this app).
export async function sendWelcomeEmail(params: {
  to: string;
  fullName: string;
  credential: string;
  role: "worker" | "manager";
  companyName: string;
}): Promise<boolean> {
  const apiKey = env.resendApiKey;
  if (!apiKey) return false;

  const credentialLabel = params.role === "worker" ? "Koda za prijavo" : "Začasno geslo";
  const subject = `Vaš račun za ${params.companyName} je pripravljen`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
      <p>Pozdravljeni ${params.fullName},</p>
      <p>Za vas je bil ustvarjen račun pri <strong>${params.companyName}</strong>.</p>
      <p style="margin: 24px 0; padding: 16px 20px; background: #f1f5f9; border-radius: 12px;">
        <span style="display:block; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">${credentialLabel}</span>
        <span style="display:block; font-size: 22px; font-weight: 700; margin-top: 4px; letter-spacing: 0.05em;">${params.credential}</span>
      </p>
      <p>E-pošta: ${params.to}</p>
      <p style="color: #64748b; font-size: 13px;">Po prijavi lahko geslo spremenite.</p>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: env.resendFromAddress,
      to: params.to,
      subject,
      html,
    });
    return !error;
  } catch {
    return false;
  }
}
