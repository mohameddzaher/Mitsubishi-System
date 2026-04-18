import Link from "next/link";
import { APP } from "@/config/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(230,0,18,0.08),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(201,169,97,0.06),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,transparent_0%,transparent_40%,rgba(255,255,255,0.015)_50%,transparent_60%)]" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-[var(--color-brand)] text-white shadow-sm">
            <span className="text-lg font-bold">M</span>
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-[var(--color-text-primary)]">
              {APP.name}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">
              {APP.longName}
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="h-px w-24 bg-gradient-to-r from-[var(--color-accent-gold)] to-transparent" />
          <h2 className="max-w-md text-[22px] font-light leading-snug text-[var(--color-text-primary)]">
            Precision in motion.
            <br />
            <span className="text-[var(--color-text-secondary)]">
              20,000+ units moving Saudi Arabia since 1980.
            </span>
          </h2>
          <div className="flex items-center gap-4 text-[11px] text-[var(--color-text-muted)]">
            <span>ISO 9001:2015</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-border-strong)]" />
            <span>6,000+ projects</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-border-strong)]" />
            <span>24/7 · {APP.supportPhone}</span>
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-[var(--color-text-muted)]">
          © {new Date().getFullYear()} Mitsubishi Electric Saudi Ltd. All rights reserved.
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-md bg-[var(--color-brand)] text-white">
              <span className="text-base font-bold">M</span>
            </div>
            <div className="text-sm font-semibold">{APP.name}</div>
          </div>
          {children}
          <div className="mt-8 text-center text-[11px] text-[var(--color-text-muted)] lg:hidden">
            <Link href="/" className="hover:text-[var(--color-text-secondary)]">
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
