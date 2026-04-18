import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-base)] px-6">
      <div className="max-w-md text-center">
        <div className="font-mono text-[48px] font-bold text-[var(--color-brand)]">404</div>
        <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          The page you are looking for does not exist or was moved.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
