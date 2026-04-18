import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, isExecutive } from "@/config/roles";
import { initials, formatDateTime } from "@/lib/utils";
import { User as UserIcon, Bell, ShieldCheck, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession();
  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) redirect("/login");

  return (
    <div className="space-y-5">
      <PageHeader title="My profile" description="Your personal settings and activity" />

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar className="size-16">
            <AvatarFallback className={`text-lg ${isExecutive(session.user.role) ? "bg-[var(--color-accent-gold-muted)] text-[var(--color-accent-gold)]" : "bg-[var(--color-brand-muted)] text-[var(--color-brand)]"}`}>
              {initials(`${user.firstName} ${user.lastName}`)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold">{user.firstName} {user.lastName}</div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <Badge variant={isExecutive(session.user.role) ? "gold" : "outline"}>
                {ROLE_LABELS[session.user.role]}
              </Badge>
              <span>{user.email}</span>
              <span>·</span>
              <span className="font-mono">{user.employeeId}</span>
            </div>
            {user.lastLoginAt && (
              <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                Last login: {formatDateTime(user.lastLoginAt)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard href="/profile/preferences" title="Preferences" description="Theme, language, timezone" icon={<Settings className="size-4" />} />
        <ActionCard href="/profile/notifications" title="Notifications" description="Channels, quiet hours" icon={<Bell className="size-4" />} />
        <ActionCard href="/profile/security" title="Security" description="Password, sessions, 2FA" icon={<ShieldCheck className="size-4" />} />
        <ActionCard href="/notifications" title="Inbox" description="View all notifications" icon={<UserIcon className="size-4" />} />
      </div>
    </div>
  );
}

function ActionCard({ href, title, description, icon }: { href: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:border-[var(--color-border-default)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon} {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
