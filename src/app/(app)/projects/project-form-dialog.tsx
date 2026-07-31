"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScheduleUpload } from "@/components/schedule-upload";
import { createProject, updateProject } from "./actions";
import { PROJECT_STATUS_LABELS } from "@/lib/procurement";

type ProjectData = {
  id: string;
  name: string;
  address: string | null;
  status: "ACTIVE" | "ON_HOLD" | "COMPLETE";
  startDate: Date | null;
  endDate: Date | null;
};

function toInputDate(d: Date | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function ProjectFormDialog({
  project,
  trigger,
}: {
  project?: ProjectData;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const router = useRouter();
  const isEdit = !!project;

  function resetOpenState(next: boolean) {
    setOpen(next);
    if (!next) {
      setStep(1);
      setCreatedProjectId(null);
    }
  }

  function finish(projectId: string) {
    setOpen(false);
    setStep(1);
    setCreatedProjectId(null);
    router.push(`/projects/${projectId}`);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateProject(project.id, formData);
          toast.success("Project updated");
          setOpen(false);
        } else {
          const created = await createProject(formData);
          toast.success("Project created");
          setCreatedProjectId(created.id);
          setStep(2);
        }
        router.refresh();
      } catch {
        toast.error("Something went wrong saving the project.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={resetOpenState}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {step === 1 || isEdit ? (
          <>
            <DialogHeader>
              <DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" name="name" required defaultValue={project?.name} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" defaultValue={project?.address ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={project?.status ?? "ACTIVE"}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={toInputDate(project?.startDate ?? null)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    defaultValue={toInputDate(project?.endDate ?? null)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving..." : isEdit ? "Save Changes" : "Next: Add Schedule"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add Equipment Schedule</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Optionally upload the project&apos;s equipment schedule now — Claude will pull out
              the equipment/product tags for you to review. You can always do this later from the
              project&apos;s Schedule Import tab.
            </p>
            {createdProjectId && (
              <ScheduleUpload
                projectId={createdProjectId}
                onUploaded={() => finish(createdProjectId)}
              />
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => createdProjectId && finish(createdProjectId)}
              >
                Skip for now
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
