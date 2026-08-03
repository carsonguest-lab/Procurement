import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserFormDialog } from "./user-form-dialog";
import { UserRowActions } from "./user-row-actions";
import { PendingInvites } from "./pending-invites";
import { formatDate } from "@/lib/procurement";

export default async function TeamPage() {
  const admin = await requireAdmin();

  const [users, invites, projects, memberships] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.invite.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { invitedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.projectMembership.findMany({ select: { userId: true, projectId: true, role: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Team</h2>
          <p className="text-sm text-muted-foreground">
            Manage who has access and their permission level.
          </p>
        </div>
        <UserFormDialog
          trigger={
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Invite Team Member
            </Button>
          }
        />
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <UserRowActions
                    userId={user.id}
                    userName={user.name}
                    role={user.role}
                    isSelf={user.id === admin.id}
                    projects={projects}
                    memberships={memberships
                      .filter((m) => m.userId === user.id)
                      .map((m) => ({ projectId: m.projectId, role: m.role }))}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PendingInvites invites={invites} />
    </div>
  );
}
