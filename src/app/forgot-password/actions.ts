"use server";

import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_EXPIRY_MS = 60 * 60 * 1000;

const schema = z.object({ email: z.string().email() });

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Anti-enumeration: this action never reveals whether the email matched an
// account. It always resolves the same way for the caller.
export async function requestPasswordReset(formData: FormData) {
  const parsed = schema.parse({ email: formData.get("email") });

  const user = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_EXPIRY_MS),
    },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail({ to: user.email, resetUrl });
  } catch (e) {
    console.error("Failed to send password reset email:", e);
  }
}
