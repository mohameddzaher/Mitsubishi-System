import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const TYPES = [
  { key: "task_assigned", label: "Task assigned to me" },
  { key: "task_due", label: "Task due soon" },
  { key: "task_overdue", label: "Task overdue" },
  { key: "visit_scheduled", label: "Visit scheduled for me" },
  { key: "spare_approval_needed", label: "Spare part approval needed" },
  { key: "spare_approved", label: "Spare part approved/rejected" },
  { key: "dispute_raised", label: "Dispute raised/forwarded to me" },
  { key: "invoice_overdue", label: "Invoice overdue (collection)" },
  { key: "contract_expiring", label: "Contract expiring" },
  { key: "lead_assigned", label: "New lead assigned" },
  { key: "mention", label: "@mention in a comment" },
  { key: "kpi_alert", label: "KPI threshold breach" },
];

export default function ProfileNotificationsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Notification preferences" description="Choose how and when you get notified" />

      <Card>
        <CardHeader>
          <CardTitle>By channel × type</CardTitle>
          <CardDescription>In-app notifications are always on.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)]">
                  <th className="py-2 text-left text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Event</th>
                  <th className="py-2 text-center text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">In-app</th>
                  <th className="py-2 text-center text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Email</th>
                  <th className="py-2 text-center text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Push</th>
                </tr>
              </thead>
              <tbody>
                {TYPES.map((t) => (
                  <tr key={t.key} className="border-b border-[var(--color-border-subtle)] last:border-0">
                    <td className="py-2">{t.label}</td>
                    <td className="py-2 text-center"><input type="checkbox" defaultChecked className="accent-[var(--color-brand)]" /></td>
                    <td className="py-2 text-center"><input type="checkbox" defaultChecked={t.key.includes("overdue") || t.key === "dispute_raised"} className="accent-[var(--color-brand)]" /></td>
                    <td className="py-2 text-center"><input type="checkbox" defaultChecked={t.key === "visit_scheduled" || t.key === "task_overdue"} className="accent-[var(--color-brand)]" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiet hours</CardTitle>
          <CardDescription>Mute push notifications during these hours</CardDescription>
        </CardHeader>
        <CardContent className="text-xs">
          <Badge variant="outline">22:00 – 07:00 · Asia/Riyadh</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily digest</CardTitle>
          <CardDescription>One summary email at 08:00 with anything you missed</CardDescription>
        </CardHeader>
        <CardContent className="text-xs">
          <Badge variant="outline">Enabled</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
