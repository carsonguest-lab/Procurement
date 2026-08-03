import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

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

type SessionUser = Session["user"];

/**
 * Admins are implicitly all-access. Members/Viewers only have access to a
 * project if they hold an explicit ProjectMembership row for it.
 */
export async function getProjectRole(
  user: SessionUser,
  projectId: string
): Promise<"ADMIN" | "MEMBER" | "VIEWER" | null> {
  if (user.role === "ADMIN") return "ADMIN";

  const membership = await prisma.projectMembership.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

export async function requireProjectAccess(projectId: string) {
  const user = await requireUser();
  const role = await getProjectRole(user, projectId);
  if (!role) {
    throw new ForbiddenError("You don't have access to this project.");
  }
  return user;
}

export async function requireProjectWriter(projectId: string) {
  const user = await requireUser();
  const role = await getProjectRole(user, projectId);
  if (!role || role === "VIEWER") {
    throw new ForbiddenError("You don't have write access to this project.");
  }
  return user;
}

/** "ALL" for Admins; otherwise the list of project IDs the user can access. */
export async function getAccessibleProjectIds(
  user: SessionUser
): Promise<"ALL" | string[]> {
  if (user.role === "ADMIN") return "ALL";

  const memberships = await prisma.projectMembership.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  return memberships.map((m) => m.projectId);
}

/** Whether the user has write (MEMBER-or-above) access to at least one project. */
export async function hasAnyProjectWriteAccess(user: SessionUser): Promise<boolean> {
  if (user.role === "ADMIN") return true;

  const membership = await prisma.projectMembership.findFirst({
    where: { userId: user.id, role: "MEMBER" },
    select: { id: true },
  });
  return !!membership;
}
