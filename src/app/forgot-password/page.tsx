"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await requestPasswordReset(formData);
      } catch {
        // Intentionally swallowed — always show the same message so we
        // never reveal whether an email address has an account.
      }
      setSubmitted(true);
    });
  }

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
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>
            {submitted
              ? "If that email has an account, we've sent a link to reset the password."
              : "Enter your email and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted && (
            <form action={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" required>Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
              </div>
              <Button type="submit" className="mt-2 w-full" disabled={pending}>
                {pending ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
          <Link href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
