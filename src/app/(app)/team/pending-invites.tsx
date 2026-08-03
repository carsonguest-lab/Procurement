"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABELS, formatDate } from "@/lib/procurement";
import { revokeInvite } from "./actions";

type Invite = {
  id: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  expiresAt: Date;
  invitedBy: { name: string } | null;
};

export function PendingInvites({ invites }: { invites: Invite[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRevoke(id: string) {
    startTransition(async () => {
      try {
        await revokeInvite(id);
        toast.success("Invite revoked");
        router.refresh();
      } catch {
        toast.error("Couldn't revoke that invite.");
      }
    });
  }

  if (invites.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">Pending Invites</h3>
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Invited By</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="font-medium">{invite.email}</TableCell>
                <TableCell className="text-muted-foreground">
                  {ROLE_LABELS[invite.role]}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {invite.invitedBy?.name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(invite.expiresAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleRevoke(invite.id)}
                  >
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
