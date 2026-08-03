import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, getProjectRole } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { ScheduleImportStatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/procurement";
import { ExtractedTagReviewTable } from "./review-table";

export default async function ScheduleImportReviewPage({
  params,
}: {
  params: Promise<{ id: string; importId: string }>;
}) {
  const user = await requireUser();
  const { id, importId } = await params;

  const scheduleImport = await prisma.scheduleImport.findUnique({
    where: { id: importId },
    include: { tags: { orderBy: { createdAt: "asc" } } },
  });
  if (!scheduleImport || scheduleImport.projectId !== id) notFound();

  const role = await getProjectRole(user, id);
  if (!role) notFound();

  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const canWrite = role === "ADMIN" || role === "MEMBER";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link
          href={`/projects/${id}?tab=imports`}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Schedule Import
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{scheduleImport.fileName}</h2>
          <ScheduleImportStatusBadge status={scheduleImport.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Uploaded {formatDate(scheduleImport.createdAt)}. Review each extracted tag, fill in the
          fields the AI can&apos;t know, then approve into the Material Log or reject.
        </p>
      </div>

      {scheduleImport.status === "FAILED" ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-red-600 dark:text-red-400">
          {scheduleImport.error ?? "Extraction failed."}
        </p>
      ) : scheduleImport.tags.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {scheduleImport.status === "PROCESSING"
            ? "Still processing…"
            : "No tags were extracted from this schedule."}
        </p>
      ) : (
        <ExtractedTagReviewTable
          tags={scheduleImport.tags}
          vendors={vendors}
          canWrite={canWrite}
        />
      )}

      {canWrite && (
        <div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${id}?tab=imports`}>Done</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
