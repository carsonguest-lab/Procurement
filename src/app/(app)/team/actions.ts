"use server";

import { z } from "zod";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendInviteEmail } from "@/lib/email";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const inviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createInvite(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = inviteSchema.parse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existingUser) {
    throw new Error("A user with that email already has an account.");
  }

  // Only one live invite per email — invalidate any prior pending invite.
  await prisma.invite.deleteMany({
    where: { email: parsed.email, acceptedAt: null },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");

  await prisma.invite.create({
    data: {
      email: parsed.email,
      role: parsed.role,
      tokenHash: hashToken(rawToken),
      invitedById: admin.id,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS),
    },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const inviteUrl = `${appUrl}/accept-invite?token=${rawToken}`;

  await sendInviteEmail({ to: parsed.email, role: parsed.role, inviteUrl });

  revalidatePath("/team");
}

export async function revokeInvite(inviteId: string) {
  await requireAdmin();
  await prisma.invite.delete({ where: { id: inviteId } });
  revalidatePath("/team");
}

export async function updateUserRole(userId: string, role: "ADMIN" | "MEMBER" | "VIEWER") {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    throw new Error("You cannot change your own role.");
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/team");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    throw new Error("You cannot remove your own account.");
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/team");
}

export async function setProjectMembership(
  userId: string,
  projectId: string,
  role: "MEMBER" | "VIEWER" | null
) {
  await requireAdmin();

  if (role === null) {
    await prisma.projectMembership.deleteMany({ where: { userId, projectId } });
  } else {
    await prisma.projectMembership.upsert({
      where: { userId_projectId: { userId, projectId } },
      update: { role },
      create: { userId, projectId, role },
    });
  }

  revalidatePath("/team");
}
