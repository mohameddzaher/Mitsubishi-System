import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer, Unit } from "@/models";
import { createDispute } from "@/server/disputes/actions";

export const dynamic = "force-dynamic";

export default async function NewSupportTicketPage() {
  const session = await requireSession();
  await connectDB();
  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/portal/support" className="text-[var(--color-text-muted)]">← Support</Link></div>

      <div>
        <h1 className="text-[18px] font-semibold">Open a support ticket</h1>
        <p className="text-xs text-[var(--color-text-muted)]">We will respond within 2 business hours.</p>
      </div>

      <form action={createDispute} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Describe the issue</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <input type="hidden" name="customerId" value={customer ? String(customer._id) : ""} />
            <input type="hidden" name="category" value="customer_complaint" />
            <div className="space-y-1.5">
              <Label htmlFor="title">Subject *</Label>
              <Input id="title" name="title" required placeholder="Short summary" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Details</Label>
              <Textarea id="description" name="description" placeholder="What happened, when, and any other context..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="severity">Urgency *</Label>
              <select id="severity" name="severity" required defaultValue="medium" className="h-9 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                <option value="critical">Critical - unit offline</option>
                <option value="high">High - affecting operations</option>
                <option value="medium">Medium</option>
                <option value="low">Low - inquiry or suggestion</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild><Link href="/portal/support">Cancel</Link></Button>
          <Button type="submit">Submit ticket</Button>
        </div>
      </form>
    </div>
  );
}
