import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Siren, Phone, AlertTriangle } from "lucide-react";
import { APP } from "@/config/constants";

export const dynamic = "force-dynamic";

export default function EmergencyReportPage() {
  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/portal" className="text-[var(--color-text-muted)]">← Portal home</Link></div>

      <div>
        <h1 className="flex items-center gap-2 text-[18px] font-semibold text-[var(--color-danger)]">
          <Siren className="size-5" /> Report an emergency
        </h1>
        <p className="text-xs text-[var(--color-text-muted)]">Entrapments, breakdowns, safety concerns — 60-minute response SLA.</p>
      </div>

      <Card className="border-[var(--color-danger)]/40 bg-[rgba(239,68,68,0.05)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--color-danger)]">
            <AlertTriangle className="size-4" /> If someone is trapped
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <p>Stay calm. Reassure the trapped person that help is on the way. Do not attempt to force the door open.</p>
          <p className="font-semibold">Call our 24/7 hotline immediately:</p>
          <Button variant="danger" className="w-full" asChild>
            <a href="tel:8001282828">
              <Phone /> Call {APP.supportPhone} now
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Non-critical issue?</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-[var(--color-text-muted)]">If no one is in immediate danger, log a ticket and we will respond within 2 business hours.</p>
          <Button className="w-full" asChild variant="secondary">
            <Link href="/portal/support/new">Open a support ticket</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
