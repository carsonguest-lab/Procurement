"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

const nameSchema = z.object({ name: z.string().min(1, "Name is required") });

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const parsed = nameSchema.parse({ name: formData.get("name") });

  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.name } });
  revalidatePath("/profile");
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function changePassword(formData: FormData) {
  const user = await requireUser();
  const parsed = passwordSchema.parse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const valid = await bcrypt.compare(parsed.currentPassword, dbUser.passwordHash);
  if (!valid) {
    throw new Error("Current password is incorrect.");
  }

  const passwordHash = await bcrypt.hash(parsed.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
}
