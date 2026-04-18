import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Shield, Building2, Bell, Palette, Key, ScrollText, Settings as Cog } from "lucide-react";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { title: "Users & Roles", description: "Manage team members, assign roles and departments", icon: Users, href: "/settings/users" },
  { title: "Permissions matrix", description: "Fine-grained RBAC rules per role", icon: Shield, href: "/settings/roles" },
  { title: "Branches", description: "Regional offices and their configuration", icon: Building2, href: "/settings/branches" },
  { title: "Notifications", description: "Email, push, and in-app preferences", icon: Bell, href: "/settings/preferences" },
  { title: "Appearance", description: "Theme, density, language (English · Arabic Phase 2)", icon: Palette, href: "/settings/appearance" },
  { title: "Security", description: "Password, sessions, two-factor authentication", icon: Key, href: "/settings/security" },
  { title: "Audit log", description: "Every critical action tracked immutably", icon: ScrollText, href: "/settings/audit-log" },
  { title: "System preferences", description: "VAT rate, SLA targets, currency, timezone", icon: Cog, href: "/settings/system" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="System configuration and administration" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="h-full transition-colors hover:border-[var(--color-border-default)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="size-4 text-[var(--color-brand)]" />
                    {s.title}
                  </CardTitle>
                  <CardDescription>{s.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
