"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-base)] px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[rgba(239,68,68,0.12)] text-[var(--color-danger)]">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          An unexpected error occurred. Our team has been notified.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[10px] text-[var(--color-text-muted)]">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
