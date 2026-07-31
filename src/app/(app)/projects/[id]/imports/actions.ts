"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth-helpers";
import { computeOrderByDate } from "@/lib/procurement";
import { extractEquipmentTags } from "@/lib/schedule-extraction";

function revalidateImportPaths(projectId: string, importId?: string) {
  revalidatePath(`/projects/${projectId}`);
  if (importId) revalidatePath(`/projects/${projectId}/imports/${importId}`);
}

export async function createScheduleImport({
  projectId,
  fileName,
  fileUrl,
}: {
  projectId: string;
  fileName: string;
  fileUrl: string;
}) {
  const user = await requireWriter();

  const scheduleImport = await prisma.scheduleImport.create({
    data: {
      projectId,
      fileName,
      fileUrl,
      status: "PROCESSING",
      uploadedById: user.id,
    },
  });

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Could not download the uploaded file (${response.status}).`);
    }
    const pdfBytes = Buffer.from(await response.arrayBuffer());

    const tags = await extractEquipmentTags(pdfBytes);
    if (tags.length === 0) {
      throw new Error("No equipment tags were found in this schedule.");
    }

    await prisma.$transaction([
      prisma.extractedTag.createMany({
        data: tags.map((t) => ({
          importId: scheduleImport.id,
          tag: t.tag,
          description: t.description ?? null,
          pageNumber: t.pageNumber ?? null,
        })),
      }),
      prisma.scheduleImport.update({
        where: { id: scheduleImport.id },
        data: { status: "READY_FOR_REVIEW" },
      }),
    ]);
  } catch (e) {
    await prisma.scheduleImport.update({
      where: { id: scheduleImport.id },
      data: {
        status: "FAILED",
        error: e instanceof Error ? e.message : "Extraction failed.",
      },
    });
  }

  revalidateImportPaths(projectId, scheduleImport.id);
  return scheduleImport.id;
}

const approveSchema = z.object({
  material: z.string().min(1, "Material is required"),
  vendorId: z.string().min(1, "Subcontractor is required"),
  leadTimeDays: z.coerce.number().int().min(0),
  requiredOnSiteDate: z.string().min(1, "Required-on-site date is required"),
  orderByDate: z.string().optional(),
});

export async function approveExtractedTag(
  tagId: string,
  input: {
    material: string;
    vendorId: string;
    leadTimeDays: number;
    requiredOnSiteDate: string;
    orderByDate?: string;
  }
) {
  const user = await requireWriter();
  const parsed = approveSchema.parse(input);

  const extractedTag = await prisma.extractedTag.findUniqueOrThrow({
    where: { id: tagId },
    include: { import: true },
  });

  const requiredOnSiteDate = new Date(parsed.requiredOnSiteDate);
  const orderByDate = parsed.orderByDate
    ? new Date(parsed.orderByDate)
    : computeOrderByDate(requiredOnSiteDate, parsed.leadTimeDays);

  const materialItem = await prisma.materialItem.create({
    data: {
      projectId: extractedTag.import.projectId,
      vendorId: parsed.vendorId,
      material: parsed.material,
      leadTimeDays: parsed.leadTimeDays,
      requiredOnSiteDate,
      orderByDate,
      submittalStatus: "NOT_SUBMITTED",
      loggedById: user.id,
    },
  });

  await prisma.extractedTag.update({
    where: { id: tagId },
    data: { status: "APPROVED", materialItemId: materialItem.id },
  });

  revalidatePath("/materials");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidateImportPaths(extractedTag.import.projectId, extractedTag.importId);
}

export async function rejectExtractedTag(tagId: string) {
  await requireWriter();

  const extractedTag = await prisma.extractedTag.update({
    where: { id: tagId },
    data: { status: "REJECTED" },
    include: { import: true },
  });

  revalidateImportPaths(extractedTag.import.projectId, extractedTag.importId);
}
