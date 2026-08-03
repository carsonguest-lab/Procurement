"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvite } from "./actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await acceptInvite(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" required>Your Name</Label>
        <Input id="name" name="name" required autoFocus />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password" required>Choose a Password</Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="mt-2 w-full" disabled={pending}>
        {pending ? "Creating account..." : "Accept & Sign In"}
      </Button>
    </form>
  );
}
