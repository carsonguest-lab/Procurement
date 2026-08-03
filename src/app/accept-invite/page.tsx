import crypto from "crypto";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/procurement";
import { AcceptInviteForm } from "./accept-invite-form";

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const invite = token
    ? await prisma.invite.findUnique({ where: { tokenHash: hashToken(token) } })
    : null;

  const valid = !!invite && !invite.acceptedAt && invite.expiresAt > new Date();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
              P
            </div>
            <span className="font-heading text-lg font-semibold tracking-tight">ProProcure</span>
          </div>
          <CardTitle>{valid ? "Accept your invite" : "Invite not found"}</CardTitle>
          <CardDescription>
            {valid && invite
              ? `You're joining as ${invite.email} with ${ROLE_LABELS[invite.role]} access. Set your name and password to finish.`
              : "This invite link is invalid or has expired. Ask an admin to send you a new one."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {valid && token ? (
            <AcceptInviteForm token={token} />
          ) : (
            <Link href="/login" className="text-sm text-primary hover:underline">
              Back to sign in
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
