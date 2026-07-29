import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectStatusBadge } from "@/components/status-badge";
import { MaterialsTable } from "@/components/materials-table";
import { ProcurementCalendar } from "@/components/procurement-calendar";
import { ProjectFormDialog } from "../project-form-dialog";
import { MaterialFormDialog } from "@/app/(app)/materials/material-form-dialog";
import { formatDate, isAtRisk, isOverdueToOrder } from "@/lib/procurement";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  const [items, projects, vendors] = await Promise.all([
    prisma.materialItem.findMany({
      where: { projectId: id },
      include: { project: true, vendor: true },
      orderBy: { requiredOnSiteDate: "asc" },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const canWrite = user.role !== "VIEWER";
  const overdueCount = items.filter((i) => isOverdueToOrder(i)).length;
  const atRiskCount = items.filter((i) => isAtRisk(i)).length;
  const deliveredCount = items.filter((i) => i.status === "DELIVERED").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">{project.name}</h2>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {project.address || "No address on file"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(project.startDate)} – {formatDate(project.endDate)}
          </p>
        </div>
        {canWrite && (
          <ProjectFormDialog
            project={project}
            trigger={<Button variant="outline">Edit Project</Button>}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-1 pt-4">
            <span className="text-xs text-muted-foreground">Total Materials</span>
            <span className="text-2xl font-semibold">{items.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-4">
            <span className="text-xs text-muted-foreground">Delivered</span>
            <span className="text-2xl font-semibold">{deliveredCount}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-4">
            <span className="text-xs text-muted-foreground">Overdue to Order</span>
            <span className="text-2xl font-semibold text-red-600 dark:text-red-400">
              {overdueCount}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-4">
            <span className="text-xs text-muted-foreground">At Risk</span>
            <span className="text-2xl font-semibold text-red-600 dark:text-red-400">
              {atRiskCount}
            </span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="materials">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="materials">Material Log</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
          {canWrite && (
            <MaterialFormDialog
              projects={projects}
              vendors={vendors}
              defaultProjectId={project.id}
              trigger={
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" /> Add Material
                </Button>
              }
            />
          )}
        </div>
        <TabsContent value="materials" className="mt-4">
          <MaterialsTable
            items={items}
            projects={projects}
            vendors={vendors}
            showProjectColumn={false}
            canWrite={canWrite}
            emptyMessage="No materials logged for this project yet."
          />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <ProcurementCalendar
            items={items}
            projects={projects}
            vendors={vendors}
            canWrite={canWrite}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
