import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, getAccessibleProjectIds, hasAnyProjectWriteAccess } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { MaterialFormDialog } from "./material-form-dialog";
import { MaterialsFilterBar } from "./filter-bar";
import { MaterialsTable } from "@/components/materials-table";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; vendor?: string; status?: string; division?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const accessibleIds = await getAccessibleProjectIds(user);
  const canCreate = await hasAnyProjectWriteAccess(user);

  const [projects, vendors, divisionCategoryMap, writableMemberships] = await Promise.all([
    prisma.project.findMany({
      where: accessibleIds === "ALL" ? undefined : { id: { in: accessibleIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.materialItem.findMany({
      where: { csiDivisionCode: { not: null } },
      distinct: ["csiDivisionCode", "category", "subcategory"],
      select: { csiDivisionCode: true, category: true, subcategory: true },
    }),
    user.role === "ADMIN"
      ? Promise.resolve([])
      : prisma.projectMembership.findMany({
          where: { userId: user.id, role: "MEMBER" },
          select: { projectId: true },
        }),
  ]);

  const canWrite: boolean | Set<string> =
    user.role === "ADMIN" ? true : new Set(writableMemberships.map((m) => m.projectId));

  let projectIdFilter: string | { in: string[] } | undefined;
  if (accessibleIds === "ALL") {
    projectIdFilter = params.project || undefined;
  } else if (params.project) {
    projectIdFilter = accessibleIds.includes(params.project) ? params.project : { in: [] };
  } else {
    projectIdFilter = { in: accessibleIds };
  }

  const items = await prisma.materialItem.findMany({
    where: {
      projectId: projectIdFilter,
      vendorId: params.vendor || undefined,
      status: (params.status as "NOT_ORDERED" | "ORDERED" | "DELIVERED") || undefined,
      csiDivisionCode: params.division || undefined,
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
        {canCreate && (
          <MaterialFormDialog
            projects={projects}
            vendors={vendors}
            divisionCategoryMap={divisionCategoryMap}
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
        canWrite={canWrite}
        emptyMessage="No material items match these filters."
        divisionCategoryMap={divisionCategoryMap}
      />
    </div>
  );
}
