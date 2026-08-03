"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateUserRole, deleteUser } from "./actions";
import { ManageAccessDialog } from "./manage-access-dialog";

type Project = { id: string; name: string };
type Membership = { projectId: string; role: "MEMBER" | "VIEWER" };

export function UserRowActions({
  userId,
  userName,
  role,
  isSelf,
  projects,
  memberships,
}: {
  userId: string;
  userName: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  isSelf: boolean;
  projects: Project[];
  memberships: Membership[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [accessOpen, setAccessOpen] = useState(false);

  function handleRoleChange(value: string) {
    startTransition(async () => {
      try {
        await updateUserRole(userId, value as "ADMIN" | "MEMBER" | "VIEWER");
        router.refresh();
      } catch {
        toast.error("Couldn't update role.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteUser(userId);
        toast.success("Team member removed");
        router.refresh();
      } catch {
        toast.error("Couldn't remove that account.");
      }
    });
  }

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">You</span>;
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setAccessOpen(true)}>
        Manage Access
      </Button>
      <Select defaultValue={role} onValueChange={handleRoleChange} disabled={pending}>
        <SelectTrigger className="h-8 w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ADMIN">Admin</SelectItem>
          <SelectItem value="MEMBER">Member</SelectItem>
          <SelectItem value="VIEWER">Viewer</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" size="sm" disabled={pending} onClick={handleDelete}>
        Remove
      </Button>
      <ManageAccessDialog
        open={accessOpen}
        onOpenChange={setAccessOpen}
        userId={userId}
        userName={userName}
        projects={projects}
        memberships={memberships}
      />
    </div>
  );
}
