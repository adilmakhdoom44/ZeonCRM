import { company } from "@/lib/company";

export type EmailResult =
  | { ok: true; id: string | null; delivered: boolean }
  | { ok: false; error: string };

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

/**
 * Resend over plain fetch rather than the SDK — one HTTP call does not justify a
 * dependency, and this keeps the edge/runtime story simple.
 *
 * With no API key configured the message is logged instead of sent. That keeps
 * local development and CI working without credentials, and it is deliberately
 * loud: `delivered: false` comes back so the caller can tell the user the mail
 * was composed but not actually sent, rather than quietly implying success.
 */
export async function sendEmail({ to, subject, html, replyTo }: SendArgs): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? `${company.name} <onboarding@resend.dev>`;

  if (!apiKey) {
    console.log(
      `[Zeon CRM] EMAIL NOT SENT (no RESEND_API_KEY)\n  to: ${to}\n  subject: ${subject}\n`,
    );
    return { ok: true, id: null, delivered: false };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!response.ok) {
      // Resend puts the useful part in the body; the status alone rarely says why.
      const detail = await response.text();
      return { ok: false, error: `Resend refused it (${response.status}): ${detail.slice(0, 200)}` };
    }

    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id ?? null, delivered: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not reach Resend." };
  }
}

const wrapper = (body: string) => `
<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#14171e;line-height:1.6;max-width:560px;margin:0 auto;padding:24px">
  ${body}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 14px" />
  <p style="font-size:12px;color:#94a3b8;margin:0">
    ${company.name}${company.email ? ` · ${company.email}` : ""}${company.phone ? ` · ${company.phone}` : ""}
  </p>
</div>`;

const button = (href: string, label: string) => `
  <p style="margin:24px 0">
    <a href="${href}" style="background:#2f6fed;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:600;display:inline-block">${label}</a>
  </p>
  <p style="font-size:13px;color:#64748b;margin:0">
    Or paste this into your browser:<br />
    <span style="word-break:break-all">${href}</span>
  </p>`;

export function proposalEmail({
  contactName,
  number,
  title,
  total,
  shareUrl,
}: {
  contactName: string | null;
  number: string;
  title: string;
  total: string;
  shareUrl: string;
}) {
  return {
    subject: `${company.name} — proposal ${number}: ${title}`,
    html: wrapper(`
      <p style="margin:0 0 12px">${contactName ? `Hi ${contactName},` : "Hello,"}</p>
      <p style="margin:0 0 12px">
        Here is our proposal <strong>${number}</strong> for <strong>${title}</strong>, totalling <strong>${total}</strong>.
      </p>
      <p style="margin:0">You can read it in full and accept or decline it online — no account needed.</p>
      ${button(shareUrl, "View the proposal")}
    `),
  };
}

export function invoiceEmail({
  contactName,
  number,
  title,
  amountDue,
  dueDate,
  viewUrl,
}: {
  contactName: string | null;
  number: string;
  title: string;
  amountDue: string;
  dueDate: string | null;
  viewUrl: string;
}) {
  return {
    subject: `${company.name} — invoice ${number}`,
    html: wrapper(`
      <p style="margin:0 0 12px">${contactName ? `Hi ${contactName},` : "Hello,"}</p>
      <p style="margin:0 0 12px">
        Please find invoice <strong>${number}</strong> for <strong>${title}</strong>.
      </p>
      <p style="margin:0 0 12px">
        Amount due: <strong>${amountDue}</strong>${dueDate ? ` by <strong>${dueDate}</strong>` : ""}.
      </p>
      ${button(viewUrl, "View the invoice")}
    `),
  };
}

export function passwordResetEmail({ name, resetUrl }: { name: string | null; resetUrl: string }) {
  return {
    subject: `${company.name} — reset your password`,
    html: wrapper(`
      <p style="margin:0 0 12px">${name ? `Hi ${name},` : "Hello,"}</p>
      <p style="margin:0 0 12px">
        Someone asked to reset the password on your ${company.name} account. This link works once and
        expires in an hour.
      </p>
      ${button(resetUrl, "Choose a new password")}
      <p style="font-size:13px;color:#64748b;margin:20px 0 0">
        If this wasn't you, ignore this email — nothing has changed.
      </p>
    `),
  };
}
