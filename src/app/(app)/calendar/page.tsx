import { prisma } from "@/lib/prisma";
import { requireUser, getAccessibleProjectIds, hasAnyProjectWriteAccess } from "@/lib/auth-helpers";
import { parseListParam } from "@/lib/procurement";
import { MaterialsFilterBar } from "@/app/(app)/materials/filter-bar";
import { ProcurementCalendar } from "@/components/procurement-calendar";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; vendor?: string; status?: string; division?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const accessibleIds = await getAccessibleProjectIds(user);
  const canWrite = await hasAnyProjectWriteAccess(user);

  const [projects, vendors] = await Promise.all([
    prisma.project.findMany({
      where: accessibleIds === "ALL" ? undefined : { id: { in: accessibleIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const selectedProjectIds = parseListParam(params.project);
  const selectedVendorIds = parseListParam(params.vendor);
  const selectedStatuses = parseListParam(params.status);
  const selectedDivisions = parseListParam(params.division);

  let projectIdFilter: { in: string[] } | undefined;
  if (accessibleIds === "ALL") {
    projectIdFilter = selectedProjectIds.length > 0 ? { in: selectedProjectIds } : undefined;
  } else {
    const ids =
      selectedProjectIds.length > 0
        ? selectedProjectIds.filter((id) => accessibleIds.includes(id))
        : accessibleIds;
    projectIdFilter = { in: ids };
  }

  const items = await prisma.materialItem.findMany({
    where: {
      projectId: projectIdFilter,
      vendorId: selectedVendorIds.length > 0 ? { in: selectedVendorIds } : undefined,
      status:
        selectedStatuses.length > 0
          ? { in: selectedStatuses as ("NOT_ORDERED" | "ORDERED" | "DELIVERED")[] }
          : undefined,
      csiDivisionCode: selectedDivisions.length > 0 ? { in: selectedDivisions } : undefined,
    },
    include: { project: true, vendor: true },
    orderBy: { requiredOnSiteDate: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Calendar</h2>
        <p className="text-sm text-muted-foreground">
          Order-by and required-on-site dates across your procurement log.
        </p>
      </div>

      <MaterialsFilterBar projects={projects} vendors={vendors} />

      <ProcurementCalendar
        items={items}
        projects={projects}
        vendors={vendors}
        canWrite={canWrite}
      />
    </div>
  );
}
