"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProjectWriter } from "@/lib/auth-helpers";
import { computeOrderByDate, isSubmittalApproved } from "@/lib/procurement";

const SUBMITTAL_STATUSES = [
  "NOT_SUBMITTED",
  "SUBMITTED",
  "APPROVED",
  "APPROVED_AS_NOTED",
  "REVISE_AND_RESUBMIT",
  "REJECTED",
] as const;

const materialSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  vendorId: z.string().min(1, "Subcontractor is required"),
  material: z.string().min(1, "Material is required"),
  leadTimeDays: z.coerce.number().int().min(0),
  requiredOnSiteDate: z.string().min(1, "Required-on-site date is required"),
  orderByDate: z.string().optional(),
  submittalStatus: z.enum(SUBMITTAL_STATUSES),
  csiDivisionCode: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  notes: z.string().optional(),
});

function parseForm(formData: FormData) {
  const csiDivisionCode = formData.get("csiDivisionCode");
  return materialSchema.parse({
    projectId: formData.get("projectId"),
    vendorId: formData.get("vendorId"),
    material: formData.get("material"),
    leadTimeDays: formData.get("leadTimeDays"),
    requiredOnSiteDate: formData.get("requiredOnSiteDate"),
    orderByDate: formData.get("orderByDate") || undefined,
    submittalStatus: formData.get("submittalStatus"),
    csiDivisionCode: csiDivisionCode && csiDivisionCode !== "NONE" ? csiDivisionCode : undefined,
    category: formData.get("category") || undefined,
    subcategory: formData.get("subcategory") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

function resolveOrderByDate(requiredOnSiteDate: Date, leadTimeDays: number, override?: string) {
  return override ? new Date(override) : computeOrderByDate(requiredOnSiteDate, leadTimeDays);
}

export async function createMaterialItem(formData: FormData) {
  const parsed = parseForm(formData);
  const user = await requireProjectWriter(parsed.projectId);
  const requiredOnSiteDate = new Date(parsed.requiredOnSiteDate);

  const item = await prisma.materialItem.create({
    data: {
      projectId: parsed.projectId,
      vendorId: parsed.vendorId,
      material: parsed.material,
      leadTimeDays: parsed.leadTimeDays,
      requiredOnSiteDate,
      orderByDate: resolveOrderByDate(requiredOnSiteDate, parsed.leadTimeDays, parsed.orderByDate),
      submittalStatus: parsed.submittalStatus,
      csiDivisionCode: parsed.csiDivisionCode || null,
      category: parsed.category || null,
      subcategory: parsed.subcategory || null,
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
  const parsed = parseForm(formData);
  const existing = await prisma.materialItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { projectId: true },
  });
  await requireProjectWriter(existing.projectId);
  if (parsed.projectId !== existing.projectId) {
    await requireProjectWriter(parsed.projectId);
  }
  const requiredOnSiteDate = new Date(parsed.requiredOnSiteDate);

  await prisma.materialItem.update({
    where: { id: itemId },
    data: {
      projectId: parsed.projectId,
      vendorId: parsed.vendorId,
      material: parsed.material,
      leadTimeDays: parsed.leadTimeDays,
      requiredOnSiteDate,
      orderByDate: resolveOrderByDate(requiredOnSiteDate, parsed.leadTimeDays, parsed.orderByDate),
      submittalStatus: parsed.submittalStatus,
      csiDivisionCode: parsed.csiDivisionCode || null,
      category: parsed.category || null,
      subcategory: parsed.subcategory || null,
      notes: parsed.notes || null,
    },
  });

  revalidatePath("/materials");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath(`/projects/${existing.projectId}`);
  if (parsed.projectId !== existing.projectId) revalidatePath(`/projects/${parsed.projectId}`);
}

export async function deleteMaterialItem(itemId: string) {
  const existing = await prisma.materialItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { projectId: true },
  });
  await requireProjectWriter(existing.projectId);

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
  const current = await prisma.materialItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { projectId: true, submittalStatus: true },
  });
  await requireProjectWriter(current.projectId);

  if (status === "ORDERED" || status === "DELIVERED") {
    if (!isSubmittalApproved(current.submittalStatus)) {
      throw new Error(
        "Can't proceed with procurement until the submittal is approved for this item."
      );
    }
  }

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

export async function setSubmittalStatus(
  itemId: string,
  submittalStatus: (typeof SUBMITTAL_STATUSES)[number]
) {
  const existing = await prisma.materialItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { projectId: true },
  });
  await requireProjectWriter(existing.projectId);

  const item = await prisma.materialItem.update({
    where: { id: itemId },
    data: { submittalStatus },
  });

  revalidatePath("/materials");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath(`/projects/${item.projectId}`);
}
