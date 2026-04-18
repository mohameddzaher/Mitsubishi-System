import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const session = await requireSession();
  await connectDB();
  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold">Account</h1>
        <p className="text-xs text-[var(--color-text-muted)]">Your MELSA Mecca customer account</p>
      </div>

      {customer ? (
        <>
          <Card>
            <CardHeader><CardTitle>Company</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Commercial name">{customer.commercialName}</Row>
              <Row label="Code"><span className="font-mono text-[11px]">{customer.code}</span></Row>
              <Row label="Type"><Badge variant="outline">{customer.type}</Badge></Row>
              <Row label="Status"><Badge variant={customer.status === "active" ? "success" : "outline"}>{customer.status}</Badge></Row>
              {customer.activatedAt && <Row label="Customer since">{formatDate(customer.activatedAt)}</Row>}
              {customer.taxNumber && <Row label="VAT number"><span className="font-mono text-[11px]">{customer.taxNumber}</span></Row>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Account credentials</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Email">{session.user.email}</Row>
              <Row label="Portal user">{session.user.firstName} {session.user.lastName}</Row>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-5 text-center text-xs text-[var(--color-text-muted)]">
            No customer account linked. Contact your MELSA account manager.
          </CardContent>
        </Card>
      )}
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
