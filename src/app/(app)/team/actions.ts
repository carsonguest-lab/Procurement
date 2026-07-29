"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export async function createUser(formData: FormData) {
  await requireAdmin();

  const parsed = userSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  const passwordHash = await bcrypt.hash(parsed.password, 10);

  await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      passwordHash,
      role: parsed.role,
    },
  });

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
