import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { UserRole, ROLE_LABELS } from "@/config/roles";
import { createAnnouncement } from "@/server/announcements/actions";

export const dynamic = "force-dynamic";

export default async function NewAnnouncementPage() {
  await requireRole([
    UserRole.SUPER_ADMIN,
    UserRole.CHAIRMAN,
    UserRole.CEO,
    UserRole.COO,
    UserRole.BRANCH_MANAGER,
    UserRole.DEPUTY_BRANCH_MANAGER,
    UserRole.HEAD_OF_HR,
    UserRole.HEAD_OF_SALES,
    UserRole.HEAD_OF_SERVICE,
    UserRole.HEAD_OF_FINANCE,
    UserRole.HEAD_OF_COLLECTION,
    UserRole.HEAD_OF_PROCUREMENT,
    UserRole.HEAD_OF_IT,
    UserRole.HEAD_OF_CUSTOMER_CARE,
  ]);

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/announcements" className="text-[var(--color-text-muted)]">← All announcements</Link></div>
      <PageHeader title="New announcement" description="Broadcast to the branch (or a specific role). Recipients get an in-app notification." />

      <form action={createAnnouncement} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Message</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required placeholder="e.g., Merge freeze starts Thursday" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Body *</Label>
              <Textarea id="body" name="body" required rows={6} placeholder="Detailed message…" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Audience & delivery</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="scope">Audience</Label>
              <select id="scope" name="scope" defaultValue="branch" className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                <option value="branch">Everyone in the branch</option>
                <option value="role">Specific role</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scopeValue">Role (if targeting role)</Label>
              <select id="scopeValue" name="scopeValue" className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                <option value="">—</option>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <select id="priority" name="priority" defaultValue="normal" className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <input type="checkbox" name="pinned" value="true" className="accent-[var(--color-brand)]" />
                Pin to top
              </Label>
              <Label className="flex items-center gap-2">
                <input type="checkbox" name="notifyUsers" value="true" defaultChecked className="accent-[var(--color-brand)]" />
                Send notification to recipients
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild><Link href="/announcements">Cancel</Link></Button>
          <Button type="submit">Publish</Button>
        </div>
      </form>
    </div>
  );
}
