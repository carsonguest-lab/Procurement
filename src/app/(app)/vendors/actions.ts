"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth-helpers";

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  trade: z.string().optional(),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

function parseForm(formData: FormData) {
  return vendorSchema.parse({
    name: formData.get("name"),
    trade: formData.get("trade") || undefined,
    contactName: formData.get("contactName") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createVendor(formData: FormData) {
  await requireWriter();
  const parsed = parseForm(formData);

  const vendor = await prisma.vendor.create({
    data: {
      name: parsed.name,
      trade: parsed.trade || null,
      contactName: parsed.contactName || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      notes: parsed.notes || null,
    },
  });

  revalidatePath("/vendors");
  return vendor;
}

export async function updateVendor(vendorId: string, formData: FormData) {
  await requireWriter();
  const parsed = parseForm(formData);

  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      name: parsed.name,
      trade: parsed.trade || null,
      contactName: parsed.contactName || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      notes: parsed.notes || null,
    },
  });

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
}

export async function deleteVendor(vendorId: string) {
  await requireWriter();
  await prisma.vendor.delete({ where: { id: vendorId } });
  revalidatePath("/vendors");
}
