"use client";

import { useTransition } from "react";
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

export function UserRowActions({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
    </div>
  );
}
