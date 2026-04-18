import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { formatDateTime } from "@/lib/utils";
import { Key, ShieldCheck, Smartphone, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const session = await requireSession();
  await connectDB();
  const user = await User.findById(session.user.id).lean();

  return (
    <div className="space-y-5">
      <PageHeader title="Security" description="Password, sessions, and authentication" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-4" /> Password
          </CardTitle>
          <CardDescription>Argon2id protected · last rotated unknown</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary">Change password</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" /> Two-factor authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security (Phase 2)</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">Not enabled</Badge>
          <Button variant="secondary" className="ml-3" disabled>
            <Smartphone /> Enable 2FA
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" /> Sessions
          </CardTitle>
          <CardDescription>Active sign-ins on your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3">
            <div>
              <div className="font-medium">Current session</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">
                Last activity: {user?.lastActivityAt ? formatDateTime(user.lastActivityAt) : user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : "now"}
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
