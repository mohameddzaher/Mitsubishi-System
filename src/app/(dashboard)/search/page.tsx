import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer, Unit, WorkOrder, Invoice, Task } from "@/models";
import { scopedFilter } from "@/server/filters";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireSession();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  if (!q) {
    return (
      <div className="space-y-5">
        <PageHeader title="Global search" description="Search across customers, units, work orders, invoices, and tasks" />
        <EmptyState icon={<Search className="size-4" />} title="Type in ⌘K or append ?q= to search" description="Try: al-haram, INV-MKK, WO-MKK, or UNIT-MKK." />
      </div>
    );
  }

  await connectDB();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const filter = scopedFilter(session, { deletedAt: null });

  const [customers, units, workOrders, invoices, tasks] = await Promise.all([
    Customer.find({ ...filter, $or: [{ commercialName: regex }, { code: regex }, { legalName: regex }] }).limit(10).lean(),
    Unit.find({ ...filter, $or: [{ code: regex }, { serialNumber: regex }, { model: regex }] }).limit(10).lean(),
    WorkOrder.find({ ...filter, code: regex }).limit(10).lean(),
    Invoice.find({ ...filter, code: regex }).limit(10).lean(),
    Task.find({ ...filter, title: regex }).limit(10).lean(),
  ]);

  const total = customers.length + units.length + workOrders.length + invoices.length + tasks.length;

  return (
    <div className="space-y-5">
      <PageHeader title={`Search: "${q}"`} description={`${total} results across 5 entities`} />

      {total === 0 && (
        <EmptyState icon={<Search className="size-4" />} title="No results" description={`Nothing matched "${q}". Try a different query.`} />
      )}

      <ResultSection title={`Customers (${customers.length})`}>
        {customers.map((c) => (
          <ResultLink key={String(c._id)} href={`/customers/${c._id}`} title={c.commercialName} meta={c.code} />
        ))}
      </ResultSection>

      <ResultSection title={`Units (${units.length})`}>
        {units.map((u) => (
          <ResultLink key={String(u._id)} href={`/units/${u._id}`} title={`${u.model}`} meta={`${u.code} · ${u.type}`} />
        ))}
      </ResultSection>

      <ResultSection title={`Work orders (${workOrders.length})`}>
        {workOrders.map((w) => (
          <ResultLink key={String(w._id)} href={`/service/work-orders/${w._id}`} title={w.code} meta={`${w.type} · ${w.status}`} />
        ))}
      </ResultSection>

      <ResultSection title={`Invoices (${invoices.length})`}>
        {invoices.map((i) => (
          <ResultLink key={String(i._id)} href={`/finance/invoices/${i._id}`} title={i.code} meta={`${i.status} · ${i.total}`} />
        ))}
      </ResultSection>

      <ResultSection title={`Tasks (${tasks.length})`}>
        {tasks.map((t) => (
          <ResultLink key={String(t._id)} href={`/tasks/${t._id}`} title={t.title} meta={`${t.priority} · ${t.status}`} />
        ))}
      </ResultSection>
    </div>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        {children}
      </CardContent>
    </Card>
  );
}

function ResultLink({ href, title, meta }: { href: string; title: string; meta?: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs transition-colors hover:border-[var(--color-border-default)]">
      <span className="font-medium">{title}</span>
      {meta && <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{meta}</span>}
    </Link>
  );
}
