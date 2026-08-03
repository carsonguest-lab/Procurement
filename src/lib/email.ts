import { Resend } from "resend";
import { ROLE_LABELS } from "@/lib/procurement";
import type { Role } from "@prisma/client";

const FROM = "ProProcure <onboarding@resend.dev>";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to your environment to send emails."
    );
  }
  return new Resend(apiKey);
}

function wrapper(title: string, bodyHtml: string, ctaLabel: string, ctaUrl: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <p style="font-size: 13px; font-weight: 600; letter-spacing: 0.02em; color: #16a34a; margin: 0 0 16px;">PROPROCURE</p>
      <h1 style="font-size: 20px; margin: 0 0 12px;">${title}</h1>
      <div style="font-size: 14px; color: #374151; line-height: 1.6;">${bodyHtml}</div>
      <a href="${ctaUrl}" style="display: inline-block; margin-top: 20px; background: #16a34a; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-size: 14px; font-weight: 500;">${ctaLabel}</a>
      <p style="margin-top: 20px; font-size: 12px; color: #9ca3af; word-break: break-all;">Or copy this link: ${ctaUrl}</p>
    </div>
  `;
}

export async function sendInviteEmail({
  to,
  role,
  inviteUrl,
}: {
  to: string;
  role: Role;
  inviteUrl: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to,
    subject: "You've been invited to ProProcure",
    html: wrapper(
      "You're invited",
      `You've been invited to join ProProcure as a <strong>${ROLE_LABELS[role]}</strong>. Click below to set up your account. This invite expires in 7 days.`,
      "Accept Invite",
      inviteUrl
    ),
  });
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your ProProcure password",
    html: wrapper(
      "Reset your password",
      `We received a request to reset your ProProcure password. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
      "Reset Password",
      resetUrl
    ),
  });
}
