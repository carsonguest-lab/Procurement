"use server";

import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function acceptInvite(formData: FormData) {
  const parsed = acceptSchema.parse({
    token: formData.get("token"),
    name: formData.get("name"),
    password: formData.get("password"),
  });

  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashToken(parsed.token) },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new Error("This invite link is invalid or has expired.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    throw new Error("An account with this email already exists. Try signing in instead.");
  }

  const passwordHash = await bcrypt.hash(parsed.password, 10);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        name: parsed.name,
        email: invite.email,
        passwordHash,
        role: invite.role,
      },
    }),
    prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);

  await signIn("credentials", {
    email: invite.email,
    password: parsed.password,
    redirectTo: "/dashboard",
  });
}
