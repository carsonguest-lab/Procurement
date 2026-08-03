"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setProjectMembership } from "./actions";

type Project = { id: string; name: string };
type Membership = { projectId: string; role: "MEMBER" | "VIEWER" };

const NO_ACCESS = "NONE";

export function ManageAccessDialog({
  open,
  onOpenChange,
  userId,
  userName,
  projects,
  memberships,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  projects: Project[];
  memberships: Membership[];
}) {
  const router = useRouter();
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const roleByProject = new Map(memberships.map((m) => [m.projectId, m.role]));

  function handleChange(projectId: string, value: string) {
    setPendingProjectId(projectId);
    startTransition(async () => {
      try {
        await setProjectMembership(
          userId,
          projectId,
          value === NO_ACCESS ? null : (value as "MEMBER" | "VIEWER")
        );
        router.refresh();
      } catch {
        toast.error("Couldn't update access.");
      } finally {
        setPendingProjectId(null);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Access — {userName}</DialogTitle>
          <DialogDescription>
            Grant or revoke access to individual projects for this user. Admins always have
            access to every project regardless of this table.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {projects.length === 0 && (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          )}
          {projects.map((project) => (
            <div key={project.id} className="flex items-center justify-between gap-4">
              <span className="text-sm">{project.name}</span>
              <Select
                defaultValue={roleByProject.get(project.id) ?? NO_ACCESS}
                onValueChange={(v) => handleChange(project.id, v)}
                disabled={pendingProjectId === project.id}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ACCESS}>No Access</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
