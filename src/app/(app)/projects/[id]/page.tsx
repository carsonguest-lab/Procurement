import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectStatusBadge, ScheduleImportStatusBadge } from "@/components/status-badge";
import { MaterialsTable } from "@/components/materials-table";
import { ProcurementCalendar } from "@/components/procurement-calendar";
import { ScheduleUpload } from "@/components/schedule-upload";
import { ProjectFormDialog } from "../project-form-dialog";
import { MaterialFormDialog } from "@/app/(app)/materials/material-form-dialog";
import { formatDate, isAtRisk, isBlockedOnSubmittal, isOverdueToOrder } from "@/lib/procurement";

export const maxDuration = 60;

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; highlight?: string; date?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { tab, highlight, date } = await searchParams;
  const initialTab = tab === "calendar" ? "calendar" : tab === "imports" ? "imports" : "materials";

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  const [items, projects, vendors, scheduleImports] = await Promise.all([
    prisma.materialItem.findMany({
      where: { projectId: id },
      include: { project: true, vendor: true },
      orderBy: { requiredOnSiteDate: "asc" },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.scheduleImport.findMany({
      where: { projectId: id },
      include: { tags: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const canWrite = user.role !== "VIEWER";
  const overdueCount = items.filter((i) => isOverdueToOrder(i)).length;
  const atRiskCount = items.filter((i) => isAtRisk(i)).length;
  const blockedCount = items.filter((i) => isBlockedOnSubmittal(i)).length;
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
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
            <span className="text-xs text-muted-foreground">Blocked on Submittal</span>
            <span className="text-2xl font-semibold text-red-600 dark:text-red-400">
              {blockedCount}
            </span>
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

      <Tabs defaultValue={initialTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="materials">Material Log</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="imports">Schedule Import</TabsTrigger>
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
            highlightId={highlight}
          />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <ProcurementCalendar
            items={items}
            projects={projects}
            vendors={vendors}
            canWrite={canWrite}
            initialDate={date}
          />
        </TabsContent>
        <TabsContent value="imports" className="mt-4 flex flex-col gap-4">
          {canWrite && <ScheduleUpload projectId={project.id} />}
          {scheduleImports.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No schedules uploaded yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {scheduleImports.map((imp) => {
                const pendingCount = imp.tags.filter((t) => t.status === "PENDING").length;
                const approvedCount = imp.tags.filter((t) => t.status === "APPROVED").length;
                const rejectedCount = imp.tags.filter((t) => t.status === "REJECTED").length;
                return (
                  <Card key={imp.id}>
                    <CardContent className="flex items-center justify-between gap-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{imp.fileName}</span>
                        <span className="text-xs text-muted-foreground">
                          Uploaded {formatDate(imp.createdAt)}
                          {imp.tags.length > 0 &&
                            ` · ${pendingCount} pending, ${approvedCount} approved, ${rejectedCount} rejected`}
                        </span>
                        {imp.status === "FAILED" && imp.error && (
                          <span className="text-xs text-red-600 dark:text-red-400">{imp.error}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <ScheduleImportStatusBadge status={imp.status} />
                        {imp.status === "READY_FOR_REVIEW" && (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/projects/${project.id}/imports/${imp.id}`}>Review</Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
