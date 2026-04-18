import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const TEMPLATES = [
  { id: "invoice_email", name: "Invoice email", type: "email", scope: "Finance" },
  { id: "payment_reminder_pre", name: "Payment reminder (pre-due)", type: "email", scope: "Collection" },
  { id: "payment_reminder_overdue", name: "Payment reminder (overdue)", type: "email", scope: "Collection" },
  { id: "visit_scheduled", name: "Visit confirmation", type: "email", scope: "Service" },
  { id: "visit_feedback", name: "Visit feedback request", type: "email", scope: "Service" },
  { id: "contract_expiring", name: "Contract renewal reminder", type: "email", scope: "Sales" },
  { id: "quotation_send", name: "Quotation cover email", type: "email", scope: "Sales" },
  { id: "welcome_customer", name: "Customer welcome", type: "email", scope: "Sales" },
  { id: "password_reset", name: "Password reset", type: "email", scope: "Auth" },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Templates" description="Email, SMS and PDF templates with MELSA branding" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                {t.name}
                <Badge variant="outline">{t.type}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-[10px] text-[var(--color-text-muted)]">
              <span className="font-mono">{t.id}</span> · {t.scope}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
