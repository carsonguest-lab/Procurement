"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "./actions";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateProfile(formData);
        await update({ name: formData.get("name") });
        toast.success("Profile updated");
        router.refresh();
      } catch {
        toast.error("Couldn't update profile.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={name} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled readOnly />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
