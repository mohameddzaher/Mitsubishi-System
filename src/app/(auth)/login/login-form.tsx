"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Invalid email or password");
        setLoading(false);
        return;
      }
      toast.success("Welcome back");
      router.push(callbackUrl ?? "/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  function quickLogin(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Melsa@2026!");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@melsa-mkk.com"
            className="pl-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="pl-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <>Sign in <ArrowRight /></>}
      </Button>

      <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Test chain — end to end
        </div>
        <div className="space-y-1.5">
          {[
            { step: 1, label: "Founder", sub: "Super Admin — god view", email: "admin@melsa-mkk.com" },
            { step: 2, label: "Head of Service", sub: "Approves escalations", email: "service.head@melsa-mkk.com" },
            { step: 3, label: "Service Manager", sub: "Assigns visits + approves spare parts", email: "service.manager@melsa-mkk.com" },
            { step: 4, label: "Technician — Omar Al-Rashidi", sub: "Starts/ends visits, requests parts", email: "tech1@melsa-mkk.com" },
            { step: 5, label: "Customer portal", sub: "Views quotations, rates visits", email: "customer@melsa-mkk.com", password: "Customer@2026!" },
          ].map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => {
                setEmail(acc.email);
                setPassword(acc.password ?? "Melsa@2026!");
              }}
              className="flex w-full items-start gap-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-2.5 py-1.5 text-left transition-colors hover:border-[var(--color-brand)]"
            >
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-surface)] text-[9.5px] font-semibold text-[var(--color-text-secondary)]">
                {acc.step}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium text-[var(--color-text-primary)]">{acc.label}</span>
                <span className="block truncate text-[9.5px] text-[var(--color-text-muted)]">{acc.email}</span>
                <span className="block text-[9px] text-[var(--color-text-muted)]">{acc.sub}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-[var(--color-text-muted)]">
          Staff password: <span className="font-mono text-[var(--color-text-secondary)]">Melsa@2026!</span>{" "}
          · Customer password: <span className="font-mono text-[var(--color-text-secondary)]">Customer@2026!</span>
        </div>
      </div>
    </form>
  );
}
