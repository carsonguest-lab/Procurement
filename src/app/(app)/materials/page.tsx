import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { MaterialFormDialog } from "./material-form-dialog";
import { MaterialsFilterBar } from "./filter-bar";
import { MaterialsTable } from "@/components/materials-table";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; vendor?: string; status?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [projects, vendors] = await Promise.all([
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const items = await prisma.materialItem.findMany({
    where: {
      projectId: params.project || undefined,
      vendorId: params.vendor || undefined,
      status: (params.status as "NOT_ORDERED" | "ORDERED" | "DELIVERED") || undefined,
    },
    include: { project: true, vendor: true },
    orderBy: { requiredOnSiteDate: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Materials</h2>
          <p className="text-sm text-muted-foreground">
            Procurement log across all projects.
          </p>
        </div>
        {user.role !== "VIEWER" && (
          <MaterialFormDialog
            projects={projects}
            vendors={vendors}
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add Material
              </Button>
            }
          />
        )}
      </div>

      <MaterialsFilterBar projects={projects} vendors={vendors} />

      <MaterialsTable
        items={items}
        projects={projects}
        vendors={vendors}
        canWrite={user.role !== "VIEWER"}
        emptyMessage="No material items match these filters."
      />
    </div>
  );
}
