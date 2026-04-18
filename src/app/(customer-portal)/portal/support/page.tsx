import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Siren, MessageSquare } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PortalSupportPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold">Support</h1>
        <p className="text-xs text-[var(--color-text-muted)]">
          Get help from the MELSA Mecca team — 24/7 emergency support available.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--color-danger)]">
              <Siren className="size-4" /> Emergency
            </CardTitle>
            <CardDescription>
              For breakdowns, entrapments, or safety concerns. 60-minute response SLA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="danger" asChild>
              <a href="tel:8001282828">
                <Phone /> Call 8001282828
              </a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-4" /> General inquiry
            </CardTitle>
            <CardDescription>Questions, quotes, or non-urgent issues.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="secondary" asChild>
              <a href="mailto:makkah@melsa-mkk.com">
                <Mail /> Email us
              </a>
            </Button>
            <Button className="w-full" asChild>
              <Link href="/portal/support/new">Open a ticket</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
