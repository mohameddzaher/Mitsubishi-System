import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const session = await requireSession();

  return (
    <div className="space-y-5">
      <PageHeader title="Preferences" description="Customize your working experience" />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Theme and display density</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Theme</Label>
            <div className="mt-2 flex gap-2">
              <ThemeChoice name="Dark luxe" active />
              <ThemeChoice name="Light (Phase 2)" disabled />
              <ThemeChoice name="System" disabled />
            </div>
          </div>
          <div>
            <Label>Density</Label>
            <div className="mt-2 flex gap-2">
              <Choice name="Compact" active />
              <Choice name="Comfortable" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Localization</CardTitle>
          <CardDescription>Language and regional formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <Row label="Language">English (default)</Row>
          <Row label="Timezone">Asia/Riyadh (UTC+3)</Row>
          <Row label="Currency">SAR · Saudi Riyal</Row>
          <Row label="Date format">DD MMM YYYY</Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed-in as {session.user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" disabled>Save changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2 last:border-0 last:pb-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function Choice({ name, active, disabled }: { name: string; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
        active
          ? "border-[var(--color-brand)] bg-[var(--color-brand-muted)]"
          : "border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] disabled:opacity-40"
      }`}
    >
      {name}
    </button>
  );
}

function ThemeChoice({ name, active, disabled }: { name: string; active?: boolean; disabled?: boolean }) {
  return <Choice name={name} active={active} disabled={disabled} />;
}
