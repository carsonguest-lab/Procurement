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
import { ResetPasswordForm } from "./reset-password-form";

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const resetToken = token
    ? await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } })
    : null;

  const valid = !!resetToken && !resetToken.usedAt && resetToken.expiresAt > new Date();

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
          <CardTitle>{valid ? "Set a new password" : "Reset link invalid"}</CardTitle>
          <CardDescription>
            {valid
              ? "Choose a new password for your account."
              : "This reset link is invalid or has expired. Request a new one."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {valid && token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Request a new link
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
