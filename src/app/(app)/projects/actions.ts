"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth-helpers";

const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETE"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function toDate(value: string | undefined) {
  return value ? new Date(value) : null;
}

export async function createProject(formData: FormData) {
  await requireWriter();

  const parsed = projectSchema.parse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    status: formData.get("status"),
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
  });

  const project = await prisma.project.create({
    data: {
      name: parsed.name,
      address: parsed.address || null,
      status: parsed.status,
      startDate: toDate(parsed.startDate),
      endDate: toDate(parsed.endDate),
    },
  });

  revalidatePath("/projects");
  return project;
}

export async function updateProject(projectId: string, formData: FormData) {
  await requireWriter();

  const parsed = projectSchema.parse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    status: formData.get("status"),
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
  });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name: parsed.name,
      address: parsed.address || null,
      status: parsed.status,
      startDate: toDate(parsed.startDate),
      endDate: toDate(parsed.endDate),
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProject(projectId: string) {
  await requireWriter();
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/projects");
}
