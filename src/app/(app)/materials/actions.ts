"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth-helpers";
import { computeOrderByDate } from "@/lib/procurement";

const materialSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  vendorId: z.string().min(1, "Subcontractor is required"),
  material: z.string().min(1, "Material is required"),
  leadTimeDays: z.coerce.number().int().min(0),
  requiredOnSiteDate: z.string().min(1, "Required-on-site date is required"),
  orderByDate: z.string().optional(),
  notes: z.string().optional(),
});

function parseForm(formData: FormData) {
  return materialSchema.parse({
    projectId: formData.get("projectId"),
    vendorId: formData.get("vendorId"),
    material: formData.get("material"),
    leadTimeDays: formData.get("leadTimeDays"),
    requiredOnSiteDate: formData.get("requiredOnSiteDate"),
    orderByDate: formData.get("orderByDate") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

function resolveOrderByDate(requiredOnSiteDate: Date, leadTimeDays: number, override?: string) {
  return override ? new Date(override) : computeOrderByDate(requiredOnSiteDate, leadTimeDays);
}

export async function createMaterialItem(formData: FormData) {
  const user = await requireWriter();
  const parsed = parseForm(formData);
  const requiredOnSiteDate = new Date(parsed.requiredOnSiteDate);

  const item = await prisma.materialItem.create({
    data: {
      projectId: parsed.projectId,
      vendorId: parsed.vendorId,
      material: parsed.material,
      leadTimeDays: parsed.leadTimeDays,
      requiredOnSiteDate,
      orderByDate: resolveOrderByDate(requiredOnSiteDate, parsed.leadTimeDays, parsed.orderByDate),
      notes: parsed.notes || null,
      loggedById: user.id,
    },
  });

  revalidatePath("/materials");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath(`/projects/${parsed.projectId}`);
  return item;
}

export async function updateMaterialItem(itemId: string, formData: FormData) {
  await requireWriter();
  const parsed = parseForm(formData);
  const requiredOnSiteDate = new Date(parsed.requiredOnSiteDate);

  const item = await prisma.materialItem.update({
    where: { id: itemId },
    data: {
      projectId: parsed.projectId,
      vendorId: parsed.vendorId,
      material: parsed.material,
      leadTimeDays: parsed.leadTimeDays,
      requiredOnSiteDate,
      orderByDate: resolveOrderByDate(requiredOnSiteDate, parsed.leadTimeDays, parsed.orderByDate),
      notes: parsed.notes || null,
    },
  });

  revalidatePath("/materials");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath(`/projects/${item.projectId}`);
}

export async function deleteMaterialItem(itemId: string) {
  await requireWriter();
  const item = await prisma.materialItem.delete({ where: { id: itemId } });
  revalidatePath("/materials");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath(`/projects/${item.projectId}`);
}

export async function setMaterialStatus(
  itemId: string,
  status: "NOT_ORDERED" | "ORDERED" | "DELIVERED"
) {
  await requireWriter();

  const data: {
    status: typeof status;
    actualOrderDate?: Date | null;
    actualDeliveryDate?: Date | null;
  } = { status };

  if (status === "ORDERED") data.actualOrderDate = new Date();
  if (status === "DELIVERED") data.actualDeliveryDate = new Date();
  if (status === "NOT_ORDERED") {
    data.actualOrderDate = null;
    data.actualDeliveryDate = null;
  }

  const item = await prisma.materialItem.update({ where: { id: itemId }, data });

  revalidatePath("/materials");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath(`/projects/${item.projectId}`);
}
