import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { MaterialsFilterBar } from "@/app/(app)/materials/filter-bar";
import { ProcurementCalendar } from "@/components/procurement-calendar";

export default async function CalendarPage({
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
        canWrite={user.role !== "VIEWER"}
      />
    </div>
  );
}
