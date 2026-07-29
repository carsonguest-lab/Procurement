import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialList } from "./material-list";
import { isAtRisk, isOverdueToOrder, startOfToday } from "@/lib/procurement";

export default async function DashboardPage() {
  await requireUser();

  const items = await prisma.materialItem.findMany({
    where: { status: { not: "DELIVERED" } },
    include: { project: true, vendor: true },
    orderBy: { requiredOnSiteDate: "asc" },
  });

  const today = startOfToday();
  const in14Days = new Date(today);
  in14Days.setDate(in14Days.getDate() + 14);

  const overdueToOrder = items.filter((i) => isOverdueToOrder(i, today));
  const atRisk = items.filter((i) => isAtRisk(i, today));

  const upcomingOrders = items.filter(
    (i) =>
      i.status === "NOT_ORDERED" &&
      i.orderByDate >= today &&
      i.orderByDate <= in14Days
  );

  const upcomingDeliveries = items.filter(
    (i) => i.requiredOnSiteDate >= today && i.requiredOnSiteDate <= in14Days
  );

  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: { materialItems: { where: { status: { not: "DELIVERED" } } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          What needs attention across your procurement log.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-1 pt-4">
            <span className="text-xs text-muted-foreground">Active Materials</span>
            <span className="text-2xl font-semibold">{items.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-4">
            <span className="text-xs text-muted-foreground">Overdue to Order</span>
            <span className="text-2xl font-semibold text-red-600 dark:text-red-400">
              {overdueToOrder.length}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-4">
            <span className="text-xs text-muted-foreground">At Risk</span>
            <span className="text-2xl font-semibold text-red-600 dark:text-red-400">
              {atRisk.length}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-4">
            <span className="text-xs text-muted-foreground">Due Within 14 Days</span>
            <span className="text-2xl font-semibold">{upcomingDeliveries.length}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overdue to Order</CardTitle>
          </CardHeader>
          <CardContent>
            <MaterialList
              items={overdueToOrder}
              dateField="orderByDate"
              emptyMessage="Nothing overdue to order. Nice work."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">At Risk (past required-on-site date)</CardTitle>
          </CardHeader>
          <CardContent>
            <MaterialList
              items={atRisk}
              dateField="requiredOnSiteDate"
              emptyMessage="Nothing at risk right now."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Deadlines — Next 14 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <MaterialList
              items={upcomingOrders}
              dateField="orderByDate"
              emptyMessage="No order deadlines in the next 14 days."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required On Site — Next 14 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <MaterialList
              items={upcomingDeliveries}
              dateField="requiredOnSiteDate"
              emptyMessage="Nothing required on site in the next 14 days."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Project</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {projects.map((project) => {
              const projItems = project.materialItems;
              const overdue = projItems.filter((i) => isOverdueToOrder(i, today)).length;
              const risk = projItems.filter((i) => isAtRisk(i, today)).length;
              return (
                <li key={project.id} className="flex items-center justify-between py-2.5 text-sm">
                  <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                    {project.name}
                  </Link>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{projItems.length} active</span>
                    {overdue > 0 && (
                      <span className="text-red-600 dark:text-red-400">{overdue} overdue</span>
                    )}
                    {risk > 0 && (
                      <span className="text-red-600 dark:text-red-400">{risk} at risk</span>
                    )}
                  </div>
                </li>
              );
            })}
            {projects.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No projects yet.</p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
