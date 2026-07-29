import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { MaterialsTable } from "@/components/materials-table";
import { VendorFormDialog } from "../vendor-form-dialog";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) notFound();

  const [items, projects, vendors] = await Promise.all([
    prisma.materialItem.findMany({
      where: { vendorId: id },
      include: { project: true, vendor: true },
      orderBy: { requiredOnSiteDate: "asc" },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const canWrite = user.role !== "VIEWER";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">{vendor.name}</h2>
          <p className="text-sm text-muted-foreground">{vendor.trade || "No trade on file"}</p>
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            {vendor.contactName && <span>{vendor.contactName}</span>}
            {vendor.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {vendor.email}
              </span>
            )}
            {vendor.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {vendor.phone}
              </span>
            )}
          </div>
          {vendor.notes && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{vendor.notes}</p>
          )}
        </div>
        {canWrite && (
          <VendorFormDialog vendor={vendor} trigger={<Button variant="outline">Edit Vendor</Button>} />
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Materials assigned to {vendor.name}
        </h3>
        <MaterialsTable
          items={items}
          projects={projects}
          vendors={vendors}
          showVendorColumn={false}
          canWrite={canWrite}
          emptyMessage="No material items assigned to this vendor yet."
        />
      </div>
    </div>
  );
}
