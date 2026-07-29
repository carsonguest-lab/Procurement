import { auth } from "@/lib/auth";

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireUser() {
  const session = await auth();
  if (!session) throw new ForbiddenError("Not signed in.");
  return session.user;
}

export async function requireWriter() {
  const user = await requireUser();
  if (user.role === "VIEWER") {
    throw new ForbiddenError("Viewers cannot make changes.");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Only admins can do that.");
  }
  return user;
}
