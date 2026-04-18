import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default function BillingPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Billing" description="Your MELSA Mecca subscription" />
      <Card>
        <CardHeader><CardTitle>Plan</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex items-center justify-between"><span>Current plan</span><Badge variant="gold">Enterprise · Makkah branch</Badge></div>
          <div className="flex items-center justify-between"><span>Seats</span><span className="font-mono">Unlimited</span></div>
          <div className="flex items-center justify-between"><span>Billing contact</span><span>admin@melsa-mkk.com</span></div>
          <div className="flex items-center justify-between"><span>Contract type</span><span>Internal · Mitsubishi Electric Saudi</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
