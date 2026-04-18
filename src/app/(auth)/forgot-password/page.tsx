import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/login"
        className="inline-flex w-fit items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3" /> Back to sign in
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Enter your work email address and we will send you a link to reset your password.
        </p>
      </div>
      <form className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <Input id="email" type="email" required placeholder="you@melsa-mkk.com" className="pl-9" />
          </div>
        </div>
        <Button type="submit" className="w-full">Send reset link</Button>
        <p className="text-center text-[10px] text-[var(--color-text-muted)]">
          If you do not receive an email within 5 minutes, contact IT support at 8001282828.
        </p>
      </form>
    </div>
  );
}
